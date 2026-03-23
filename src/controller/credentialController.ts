import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import credentialService from '../service/credentialService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class CredentialController {
	// POST /api/services/:serviceId/credentials
	// Cria uma nova credencial SMTP (senha criptografada pelo service).

	async create(req: Request, res: Response, next: NextFunction) {
		const serviceId = String(req.params.serviceId);
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/services/${serviceId}/credentials`));
		try {
			const userId = req.user!.id;
			const newCredential = await credentialService.createCredential(serviceId, req.body, userId);
			return CommonResponse.created(res, newCredential, 'Credencial criada com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/credentials
	// Lista todas as credenciais ativas (sem expor senhas).

	async list(req: Request, res: Response, next: NextFunction) {
		const serviceId = String(req.params.serviceId);
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${serviceId}/credentials`));
		try {
			const userId = req.user!.id;
			const credentials = await credentialService.listCredentials(serviceId, userId);
			return CommonResponse.success(
				res,
				credentials,
				200,
				`${credentials.length} credencial(is) encontrada(s).`,
			);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/credentials/:id
	// Busca uma credencial por ID (sem expor a senha).

	async getOne(req: Request, res: Response, next: NextFunction) {
		const serviceId = String(req.params.serviceId);
		const id = String(req.params.id);
		console.log(
			chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${serviceId}/credentials/${id}`),
		);
		try {
			const userId = req.user!.id;
			const found = await credentialService.getCredential(serviceId, id, userId);
			return CommonResponse.success(res, found, 200, 'Credencial encontrada.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/services/:serviceId/credentials/:id
	// Atualiza campos da credencial (se passkey for informada, é recriptografada).

	async update(req: Request, res: Response, next: NextFunction) {
		const serviceId = String(req.params.serviceId);
		const id = String(req.params.id);
		console.log(
			chalk.cyan(`[${getTimestamp()}] [PATCH] /api/services/${serviceId}/credentials/${id}`),
		);
		try {
			const userId = req.user!.id;
			const updated = await credentialService.updateCredential(serviceId, id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'Credencial atualizada com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/services/:serviceId/credentials/:id
	// Soft delete da credencial.

	async remove(req: Request, res: Response, next: NextFunction) {
		const serviceId = String(req.params.serviceId);
		const id = String(req.params.id);
		console.log(
			chalk.cyan(`[${getTimestamp()}] [DELETE] /api/services/${serviceId}/credentials/${id}`),
		);
		try {
			const userId = req.user!.id;
			const result = await credentialService.deleteCredential(serviceId, id, userId);
			return CommonResponse.success(res, result, 200, 'Credencial removida com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new CredentialController();
