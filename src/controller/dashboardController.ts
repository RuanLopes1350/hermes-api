import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import dashboardService from '../service/dashboardService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { globalQueueEvents } from '../queue/queueEvents.js';
import { emailQueue } from '../queue/emailQueue.js';

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

	/**
	 * GET /api/dashboard/stream
	 * SSE Endpoint para stremar métricas da fila em tempo real.
	 */
	async streamQueueEvents(req: Request, res: Response) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/dashboard/stream [SSE Conectado]`));

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		const sendMetrics = async () => {
			try {
				const [waiting, active, completed, failed, delayed] = await Promise.all([
					emailQueue.getWaitingCount(),
					emailQueue.getActiveCount(),
					emailQueue.getCompletedCount(),
					emailQueue.getFailedCount(),
					emailQueue.getDelayedCount(),
				]);

				const payload = { waiting, active, completed, failed, delayed };
				res.write(`data: ${JSON.stringify(payload)}\n\n`);
			} catch (err) {
				console.error('[SSE] Erro ao buscar métricas', err);
			}
		};

		sendMetrics();

		let timeout: NodeJS.Timeout | null = null;
		const debouncedSendMetrics = () => {
			if (timeout) return;
			timeout = setTimeout(() => {
				sendMetrics();
				timeout = null;
			}, 500); // Throttling de 500ms para evitar sobrecarga no Redis
		};

		globalQueueEvents.on('waiting', debouncedSendMetrics);
		globalQueueEvents.on('active', debouncedSendMetrics);
		globalQueueEvents.on('completed', debouncedSendMetrics);
		globalQueueEvents.on('failed', debouncedSendMetrics);
		globalQueueEvents.on('delayed', debouncedSendMetrics);

		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
		}, 30000);

		req.on('close', () => {
			console.log(chalk.yellow(`[${getTimestamp()}] [SSE Desconectado]`));
			clearInterval(keepAlive);
			if (timeout) clearTimeout(timeout);
			globalQueueEvents.off('waiting', debouncedSendMetrics);
			globalQueueEvents.off('active', debouncedSendMetrics);
			globalQueueEvents.off('completed', debouncedSendMetrics);
			globalQueueEvents.off('failed', debouncedSendMetrics);
			globalQueueEvents.off('delayed', debouncedSendMetrics);
			res.end();
		});
	}
}

export default new DashboardController();
