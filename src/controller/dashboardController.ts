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
			const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
			const stats = await dashboardService.getAdminStats(req.user, days);
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
			const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
			const stats = await dashboardService.getUserStats(req.user, days);
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
