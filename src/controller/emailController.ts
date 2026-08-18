import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailService from '../service/emailService.js';
import streamService from '../service/streamService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import { EmailListFilters } from '../repository/emailRepository.js';

// Extrai limit/offset da querystring com os mesmos limites de sempre (máx. 100 por página).
function parsePagination(req: Request) {
	let limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
	if (isNaN(limit) || limit <= 0) {
		limit = 50;
	} else {
		limit = Math.min(limit, 100);
	}

	let offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
	if (isNaN(offset) || offset < 0) {
		offset = 0;
	}

	return { limit, offset };
}

// Extrai os filtros compartilhados (status, busca por texto, intervalo de datas) da querystring.
function parseFilters(req: Request): EmailListFilters {
	return {
		status: typeof req.query.status === 'string' ? req.query.status : undefined,
		search: typeof req.query.search === 'string' ? req.query.search : undefined,
		startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
		endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
	};
}

class EmailController {
	// POST /api/services/:serviceId/emails
	// Enfileira um e-mail (autenticação por API Key).
	async create(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/emails`));
		try {
			// SEGURANÇA: Usamos os IDs injetados pelo middleware requireApiKey
			const verifiedServiceId = req.serviceId!;
			const verifiedCredentialId = req.credentialId!;

			// Chamamos o service passando o Service ID e a Credencial ID vinculada à chave
			const newEmail = await emailService.createEmail(
				verifiedServiceId,
				req.body,
				verifiedServiceId, // O terceiro parâmetro do service é o Service ID da chave para validação
				verifiedCredentialId, // Passaremos um QUARTO parâmetro para forçar a credencial da chave
			);

			return CommonResponse.created(res, newEmail, 'E-mail enfileirado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// POST /api/services/:serviceId/emails/bulk
	// Enfileira um array de e-mails em lote.
	async createBulk(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/emails/bulk`));
		try {
			const verifiedServiceId = req.serviceId!;
			const verifiedCredentialId = req.credentialId!;

			const result = await emailService.createBulkEmails(
				verifiedServiceId,
				req.body,
				verifiedServiceId,
				verifiedCredentialId,
			);

			return CommonResponse.created(res, result, result.message);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/emails/stream
	// Endpoint SSE para os clientes do SDK monitorarem envios
	async stream(req: Request, res: Response) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/emails/stream [SSE SDK]`));

		const serviceId = req.serviceId;
		if (!serviceId) {
			return res.status(401).json({ error: 'API Key inválida ou não identificada.' });
		}

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		const channel = `email-status:${serviceId}`;
		const listener = (message: string) => {
			res.write(`data: ${message}\n\n`);
		};

		streamService.emitter.on(channel, listener);

		req.on('close', () => {
			streamService.emitter.off(channel, listener);
		});
	}

	// GET /api/emails
	async listUserEmails(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/emails`));
		try {
			const { limit, offset } = parsePagination(req);
			const filters = parseFilters(req);
			const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;

			const { rows, total } = await emailService.listUserEmails(
				req.user,
				filters,
				limit,
				offset,
				serviceId,
			);
			return CommonResponse.success(res, rows, 200, `${rows.length} e-mail(s) encontrado(s).`, {
				total,
				limit,
				offset,
			});
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/emails?status=pending
	async list(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/emails`),
		);
		try {
			const { limit, offset } = parsePagination(req);
			const filters = parseFilters(req);

			const { rows, total } = await emailService.listEmails(
				String(req.params.serviceId),
				req.user,
				filters,
				limit,
				offset,
			);
			return CommonResponse.success(res, rows, 200, `${rows.length} e-mail(s) encontrado(s).`, {
				total,
				limit,
				offset,
			});
		} catch (error) {
			next(error);
		}
	}

	// GET /api/emails/export — CSV com todos os resultados do filtro atual (sem paginação)
	async exportCsv(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/emails/export`));
		try {
			const filters = parseFilters(req);
			const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;

			const rows = await emailService.exportUserEmails(req.user, filters, serviceId);

			const header = [
				'data_criacao',
				'status',
				'servico',
				'destinatario',
				'assunto',
				'credencial',
				'tentativas',
				'enviado_em',
				'erro',
			];
			const escapeCsv = (value: unknown) => {
				const str = value === null || value === undefined ? '' : String(value);
				return `"${str.replace(/"/g, '""')}"`;
			};
			const lines = rows.map((r: any) =>
				[
					r.createdAt,
					r.status,
					r.serviceName || '',
					r.recipient_to,
					r.subject,
					r.credentialName || '',
					r.retry_count ?? 0,
					r.sent_at || '',
					r.error_log || '',
				]
					.map(escapeCsv)
					.join(','),
			);
			const csv = [header.join(','), ...lines].join('\n');

			res.setHeader('Content-Type', 'text/csv; charset=utf-8');
			res.setHeader('Content-Disposition', `attachment; filename="emails-${Date.now()}.csv"`);
			return res.send('﻿' + csv); // BOM pra acentuação abrir certo no Excel
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/emails/:id
	async getOne(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/emails/${req.params.id}`,
			),
		);
		try {
			const found = await emailService.getEmail(
				String(req.params.serviceId),
				String(req.params.id),
				req.user,
			);
			return CommonResponse.success(res, found, 200, 'E-mail encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/services/:serviceId/emails/:id
	async cancel(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [DELETE] /api/services/${req.params.serviceId}/emails/${req.params.id}`,
			),
		);
		try {
			const result = await emailService.cancelEmail(
				String(req.params.serviceId),
				String(req.params.id),
				req.user,
			);
			return CommonResponse.success(res, result, 200, result.message);
		} catch (error) {
			next(error);
		}
	}

	// POST /api/services/:serviceId/emails/:id/retry
	async retry(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [POST] /api/services/${req.params.serviceId}/emails/${req.params.id}/retry`,
			),
		);
		try {
			const result = await emailService.retryEmail(
				String(req.params.serviceId),
				String(req.params.id),
				req.user,
			);
			return CommonResponse.success(res, result, 200, result.message);
		} catch (error) {
			next(error);
		}
	}
}

export default new EmailController();
