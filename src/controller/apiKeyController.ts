import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import apiKeyService from '../service/apiKeyService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class ApiKeyController {
	// POST /api/services/:serviceId/api-keys
	async create(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/services/${req.params.serviceId}/api-keys`));
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const result = await apiKeyService.generateApiKey(
				{ ...req.body, serviceId },
				userId,
			);
			return CommonResponse.created(res, result, 'API Key gerada com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/api-keys
	async list(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const keys = await apiKeyService.listApiKeys(serviceId, userId);
			return CommonResponse.success(res, keys, 200, `${keys.length} API Key(s) encontrada(s).`);
		} catch (error) {
			next(error);
		}
	}

    // NOVO: GET /api/api-keys (Global)
    async listGlobal(req: Request, res: Response, next: NextFunction) {
        console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/api-keys`));
        try {
            const userId = req.user!.id;
            const keys = await apiKeyService.listAllUserApiKeys(userId);
            return CommonResponse.success(res, keys, 200, `${keys.length} API Key(s) encontrada(s).`);
        } catch (error) {
            next(error);
        }
    }

	async getOne(req: Request, res: Response, next: NextFunction) {
		try {
			const id = String(req.params.id);
			const userId = req.user!.id;
			const found = await apiKeyService.getApiKey(id, userId);
			return CommonResponse.success(res, found, 200, 'API Key encontrada.');
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction) {
		try {
			const id = String(req.params.id);
			const userId = req.user!.id;
			const updated = await apiKeyService.updateApiKey(id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'API Key atualizada com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async revoke(req: Request, res: Response, next: NextFunction) {
		try {
			const id = String(req.params.id);
			const userId = req.user!.id;
			const result = await apiKeyService.revokeApiKey(id, userId);
			return CommonResponse.success(res, result, 200, 'API Key revogada com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new ApiKeyController();
