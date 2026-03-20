import { requireAuth } from './requireAuth';
import { Request, Response, NextFunction } from 'express';
import { db } from '../config/dbConfig';
import { api_key, service } from '../config/db/schema';
import { eq } from 'drizzle-orm';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

declare global {
	namespace Express {
		interface Request {
			apiKey?: typeof api_key.$inferSelect;
		}
	}
}

export async function requireApiKeyOwner(req: Request, res: Response, next: NextFunction) {
	await requireAuth(req, res, async () => {
		const apiKeyId = req.params.apiKeyId;

		if (!apiKeyId || typeof apiKeyId !== 'string') {
			return CommonResponse.error(
				res,
				HttpStatusCode.BAD_REQUEST.code,
				'MISSING_API_KEY_ID',
				null,
				[],
				'apiKeyId não informado.',
			);
		}

		try {
			const apiKeyWithOwner = await db
				.select({
					apiKey: api_key,
					serviceOwnerId: service.owner_id,
				})
				.from(api_key)
				.innerJoin(service, eq(api_key.service_id, service.id))
				.where(eq(api_key.id, apiKeyId))
				.limit(1);

			const foundApiKey = apiKeyWithOwner[0];

			if (!foundApiKey) {
				return CommonResponse.error(
					res,
					HttpStatusCode.NOT_FOUND.code,
					'API_KEY_NOT_FOUND',
					null,
					[],
					'Chave de API não encontrada.',
				);
			}

			const currentUserId = typeof req.user?.id === 'string' ? req.user.id : null;
			const isAdmin = req.user?.isAdmin === true;
			const isOwner = currentUserId !== null && foundApiKey.serviceOwnerId === currentUserId;

			if (!isOwner && !isAdmin) {
				return CommonResponse.error(
					res,
					HttpStatusCode.FORBIDDEN.code,
					'FORBIDDEN_API_KEY_ACCESS',
					null,
					[],
					'Sem permissão sobre esta chave de API.',
				);
			}

			req.apiKey = foundApiKey.apiKey;
			next();
		} catch (error) {
			return CommonResponse.error(
				res,
				HttpStatusCode.INTERNAL_SERVER_ERROR.code,
				'API_KEY_OWNER_CHECK_ERROR',
				null,
				[],
				'Erro ao validar permissão da chave de API.',
			);
		}
	});
}
