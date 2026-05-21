import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import dashboardService from '../service/dashboardService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

class DashboardController {
	/**
	 * GET /api/dashboard/admin
	 * Retorna métricas globais de infraestrutura.
	 */
	async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/dashboard/admin`));
		try {
			const isAdmin = (req.user as any)?.isAdmin ?? false;
			if (!isAdmin) {
				return CommonResponse.error(
					res,
					HttpStatusCode.FORBIDDEN.code,
					'FORBIDDEN',
					null,
					[],
					'Acesso negado. Esta rota é restrita a administradores.',
				);
			}

			const stats = await dashboardService.getAdminStats();
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
			const userId = req.user!.id;
			const stats = await dashboardService.getUserStats(userId);
			return CommonResponse.success(res, stats, 200, 'Métricas pessoais carregadas.');
		} catch (error) {
			next(error);
		}
	}
}

export default new DashboardController();
