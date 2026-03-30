import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailService from '../service/emailService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class EmailController {
	// POST /api/services/:serviceId/emails
	// Enfileira um e-mail (autenticação por API Key).
	// O req.apiKey e req.apiKeyService são injetados pelo middleware requireApiKey.

	async create(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [POST] /api/services/${req.params.serviceId}/emails`),
		);
		try {
			// SEGURANÇA: Priorizar o ID do serviço vindo da autenticação verificada
			const verifiedServiceId = req.apiKeyService!.id;

			// (Opcional) Validar se o ID da URL bate com o da API Key para evitar confusão do cliente
			const urlServiceId = String(req.params.serviceId);
			if (urlServiceId !== verifiedServiceId) {
				return CommonResponse.error(
					res,
					403,
					'FORBIDDEN',
					null,
					[],
					'API Key não pertence a este serviço.',
				);
			}

			const newEmail = await emailService.createEmail(
				verifiedServiceId,
				req.body,
				verifiedServiceId,
			);
			return CommonResponse.created(res, newEmail, 'E-mail enfileirado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/emails?status=pending
	// Lista e-mails com filtro opcional de status (autenticação por sessão).

	async list(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/emails`),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const status = typeof req.query.status === 'string' ? req.query.status : undefined;
			const emails = await emailService.listEmails(serviceId, userId, status);
			return CommonResponse.success(res, emails, 200, `${emails.length} e-mail(s) encontrado(s).`);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/emails/:id
	// Busca um e-mail por ID (autenticação por sessão).

	async getOne(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/emails/${req.params.id}`,
			),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const found = await emailService.getEmail(serviceId, id, userId);
			return CommonResponse.success(res, found, 200, 'E-mail encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/services/:serviceId/emails/:id
	// Cancela um e-mail pendente (autenticação por sessão).

	async cancel(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [DELETE] /api/services/${req.params.serviceId}/emails/${req.params.id}`,
			),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const result = await emailService.cancelEmail(serviceId, id, userId);
			return CommonResponse.success(res, result, 200, 'E-mail cancelado com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new EmailController();
