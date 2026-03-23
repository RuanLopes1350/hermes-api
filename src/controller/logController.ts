import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import logService from '../service/logService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

class LogController {
	// GET /api/logs?limit=50&offset=0
	// Lista logs com paginação. Restrito a administradores.

	async list(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/logs`));
		try {
			// Verifica se o usuário é admin
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

			const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
			const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

			const logsList = await logService.listLogs(limit, offset);
			return CommonResponse.success(res, logsList, 200, `${logsList.length} log(s) encontrado(s).`);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/logs/:id
	// Busca um log por ID. Restrito a administradores.

	async getOne(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/logs/${req.params.id}`));
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

			const id = String(req.params.id);
			const found = await logService.getLog(id);
			return CommonResponse.success(res, found, 200, 'Log encontrado.');
		} catch (error) {
			next(error);
		}
	}
}

export default new LogController();
