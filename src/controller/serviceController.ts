import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import serviceService from '../service/serviceService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class ServiceController {
	async createService(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/services`));
		try {
			const newService = await serviceService.createService(req.body, req.user);
			return CommonResponse.created(res, newService, 'Serviço criado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	async listServices(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services`));
		try {
			const services = await serviceService.listServices(req.user);
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

	async getService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${id}`));
		try {
			const found = await serviceService.getService(id, req.user);
			return CommonResponse.success(res, found, 200, 'Serviço encontrado.');
		} catch (error) {
			next(error);
		}
	}

	async updateService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [PATCH] /api/services/${id}`));
		try {
			const updated = await serviceService.updateService(id, req.body, req.user);
			return CommonResponse.success(res, updated, 200, 'Serviço atualizado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async deleteService(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [DELETE] /api/services/${id}`));
		try {
			const result = await serviceService.deleteService(id, req.user);
			return CommonResponse.success(res, result, 200, 'Serviço removido com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// ==================== MEMBERS ====================

	async listMembers(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		try {
			const members = await serviceService.listMembers(id, req.user);
			return CommonResponse.success(
				res,
				members,
				200,
				`${members.length} membro(s) encontrado(s).`,
			);
		} catch (error) {
			next(error);
		}
	}

	async addMember(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		try {
			const result = await serviceService.addMember(id, req.body.email, req.user);
			return CommonResponse.success(res, result, 200, 'Membro adicionado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async removeMember(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		const targetUserId = String(req.params.userId);
		try {
			const result = await serviceService.removeMember(id, targetUserId, req.user);
			return CommonResponse.success(res, result, 200, 'Membro removido com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async transferOwnership(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		try {
			const result = await serviceService.transferOwnership(id, req.body.newOwnerId, req.user);
			return CommonResponse.success(res, result, 200, 'Propriedade transferida com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async listLogs(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
		const offset = req.query.offset ? parseInt(String(req.query.offset)) : 0;

		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${id}/logs`));
		try {
			const logs = await serviceService.listLogs(id, limit, offset, req.user);
			return CommonResponse.success(res, logs, 200, 'Logs encontrados.');
		} catch (error) {
			next(error);
		}
	}
}

export default new ServiceController();
