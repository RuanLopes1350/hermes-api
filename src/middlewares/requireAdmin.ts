import { requireAuth } from './requireAuth';
import { Request, Response, NextFunction } from 'express';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
	await requireAuth(req, res, async () => {
		if (req.user?.isAdmin !== true) {
			return CommonResponse.error(
				res,
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN_ADMIN_ONLY',
				null,
				[],
				'Acesso restrito a administradores.',
			);
		}
		next();
	});
}
