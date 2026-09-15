import type { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
	if (!req.user || req.user.role !== 'super_admin') {
		console.warn(
			chalk.yellow(
				`[requireSuperAdmin] Acesso negado para usuário ${req.user?.email} (${req.user?.role}) na rota ${req.originalUrl}`,
			),
		);
		CommonResponse.error(
			res,
			HttpStatusCode.FORBIDDEN.code,
			'FORBIDDEN',
			null,
			[],
			'Acesso restrito ao Administrador Geral!',
		);
		return;
	}
	next();
}

