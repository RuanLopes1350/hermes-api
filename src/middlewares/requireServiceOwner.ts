import { requireAuth } from './requireAuth';
import { db } from '../config/dbConfig';
import { service } from '../config/db/schema';
import { eq } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

declare global {
	namespace Express {
		interface Request {
			service?: typeof service.$inferSelect;
		}
	}
}

export async function requireServiceOwner(req: Request, res: Response, next: NextFunction) {
	await requireAuth(req, res, async () => {
		const serviceId = req.params.serviceId;

		if (!serviceId || typeof serviceId !== 'string') {
			return CommonResponse.error(
				res,
				HttpStatusCode.BAD_REQUEST.code,
				'MISSING_SERVICE_ID',
				null,
				[],
				'serviceId não informado.',
			);
		}

		try {
			const found = await db.query.service.findFirst({
				where: eq(service.id, serviceId),
			});

			if (!found) {
				return CommonResponse.error(
					res,
					HttpStatusCode.NOT_FOUND.code,
					'SERVICE_NOT_FOUND',
					null,
					[],
					'Serviço não encontrado.',
				);
			}

			const currentUserId = typeof req.user?.id === 'string' ? req.user.id : null;
			const isAdmin = req.user?.isAdmin === true;
			const isOwner = currentUserId !== null && found.owner_id === currentUserId;

			if (!isOwner && !isAdmin) {
				return CommonResponse.error(
					res,
					HttpStatusCode.FORBIDDEN.code,
					'FORBIDDEN_SERVICE_ACCESS',
					null,
					[],
					'Sem permissão sobre este serviço.',
				);
			}

			req.service = found;
			next();
		} catch (error) {
			return CommonResponse.error(
				res,
				HttpStatusCode.INTERNAL_SERVER_ERROR.code,
				'SERVICE_OWNER_CHECK_ERROR',
				null,
				[],
				'Erro ao validar permissão do serviço.',
			);
		}
	});
}
