import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import dashboardService from '../service/dashboardService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class DashboardController {
	/**
	 * GET /api/dashboard/admin
	 * Retorna métricas globais de infraestrutura.
	 */
	async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/dashboard/admin`));
		try {
			const stats = await dashboardService.getAdminStats(req.user);
			return CommonResponse.success(res, stats, 200, 'Métricas globais carregadas.');
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/dashboard/user
	 * Retorna métricas pessoais dos serviços do usuário.
	 */
	async getUserDashboard(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/dashboard/user`));
		try {
			const stats = await dashboardService.getUserStats(req.user);
			return CommonResponse.success(res, stats, 200, 'Métricas pessoais carregadas.');
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/dashboard/stream
	 * SSE Endpoint para stremar métricas da fila em tempo real.
	 */
	async streamQueueEvents(req: Request, res: Response) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/dashboard/stream [SSE Conectado]`));
		dashboardService.streamQueueEvents(req, res);
	}
}

export default new DashboardController();
