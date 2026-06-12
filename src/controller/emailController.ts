import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailService from '../service/emailService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

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

	// GET /api/services/:serviceId/emails?status=pending
	async list(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/emails`),
		);
		try {
			const status = typeof req.query.status === 'string' ? req.query.status : undefined;
			const emails = await emailService.listEmails(String(req.params.serviceId), req.user, status);
			return CommonResponse.success(res, emails, 200, `${emails.length} e-mail(s) encontrado(s).`);
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
			return CommonResponse.success(res, result, 200, 'E-mail cancelado com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new EmailController();
