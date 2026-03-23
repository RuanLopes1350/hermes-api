import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import apiKeyService from '../service/apiKeyService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class ApiKeyController {
	// POST /api/keys
	// Gera uma nova API Key para um serviço do usuário autenticado.

	async create(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/keys`));
		try {
			const userId = req.user!.id;
			const newKey = await apiKeyService.generateApiKey(req.body, userId);
			return CommonResponse.created(
				res,
				newKey,
				'API Key gerada com sucesso! Copie o token agora.',
			);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/keys?serviceId=...
	// Lista as API Keys de um serviço (serviceId obrigatório via query param).

	async list(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/keys`));
		try {
			const userId = req.user!.id;
			const { serviceId } = req.query;

			if (!serviceId || typeof serviceId !== 'string') {
				return CommonResponse.error(
					res,
					400,
					'MISSING_PARAM',
					null,
					[],
					'O parâmetro serviceId é obrigatório.',
				);
			}

			const keys = await apiKeyService.listApiKeys(serviceId, userId);
			return CommonResponse.success(res, keys, 200, `${keys.length} key(s) encontrada(s).`);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/keys/:id
	// Busca uma API Key por ID.

	async getOne(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/keys/${id}`));
		try {
			const userId = req.user!.id;
			const found = await apiKeyService.getApiKey(id, userId);
			return CommonResponse.success(res, found, 200, 'API Key encontrada.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/keys/:id
	// Atualiza nome e/ou status da API Key.

	async update(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [PATCH] /api/keys/${id}`));
		try {
			const userId = req.user!.id;
			const updated = await apiKeyService.updateApiKey(id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'API Key atualizada com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/keys/:id
	// Revoga (soft delete) uma API Key.

	async revoke(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [DELETE] /api/keys/${id}`));
		try {
			const userId = req.user!.id;
			const result = await apiKeyService.revokeApiKey(id, userId);
			return CommonResponse.success(res, result, 200, 'API Key revogada com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new ApiKeyController();
