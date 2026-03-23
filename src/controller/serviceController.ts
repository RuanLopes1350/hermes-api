import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import serviceService from '../service/serviceService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class ServiceController {
	// POST /api/services
	// Cria um novo serviço para o usuário autenticado.

	async createService(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/services`));
		try {
			const userId = req.user!.id;
			const newService = await serviceService.createService(req.body, userId);
			return CommonResponse.created(res, newService, 'Serviço criado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services
	// Lista todos os serviços ativos do usuário autenticado.

	async listServices(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services`));
		try {
			const userId = req.user!.id;
			const services = await serviceService.listServices(userId);
			return CommonResponse.success(
				res,
				services,
				200,
				`${services.length} serviço(s) encontrado(s).`,
			);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:id
	// Busca um serviço por ID (somente o dono pode acessar).

	async getService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${id}`));
		try {
			const userId = req.user!.id;
			const found = await serviceService.getService(id, userId);
			return CommonResponse.success(res, found, 200, 'Serviço encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/services/:id
	// Atualiza nome e/ou settings (somente o dono pode alterar).

	async updateService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [PATCH] /api/services/${id}`));
		try {
			const userId = req.user!.id;
			const updated = await serviceService.updateService(id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'Serviço atualizado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/services/:id
	// Soft delete do serviço (somente o dono pode remover).

	async deleteService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [DELETE] /api/services/${id}`));
		try {
			const userId = req.user!.id;
			const result = await serviceService.deleteService(id, userId);
			return CommonResponse.success(res, result, 200, 'Serviço removido com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new ServiceController();
