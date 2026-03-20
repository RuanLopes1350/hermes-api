import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

declare global {
	namespace Express {
		interface Request {
			user?: Record<string, unknown>;
			session?: Record<string, unknown>;
		}
	}
}

export async function getSession(req: Request) {
	return auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});
}

async function getSessionFromHeaders(headers: HeadersInit) {
	return auth.api.getSession({ headers });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		let sessionData = await getSession(req);

		if (!sessionData?.user || !sessionData?.session) {
			const authorizationHeader = req.headers.authorization;
			const cookieHeader = req.headers.cookie;

			if (typeof authorizationHeader === 'string' && authorizationHeader.trim().length > 0) {
				sessionData = await getSessionFromHeaders({ authorization: authorizationHeader });
			}

			if (
				(!sessionData?.user || !sessionData?.session) &&
				typeof cookieHeader === 'string' &&
				cookieHeader.trim().length > 0
			) {
				sessionData = await getSessionFromHeaders({
					cookie: cookieHeader,
					...(typeof req.headers.origin === 'string' ? { origin: req.headers.origin } : {}),
				});
			}
		}

		if (!sessionData?.user || !sessionData?.session) {
			console.warn('[requireAuth] Sessao nao encontrada', {
				hasAuthorizationHeader: Boolean(req.headers.authorization),
				hasCookieHeader: Boolean(req.headers.cookie),
				origin: req.headers.origin ?? null,
			});

			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'UNAUTHORIZED',
				null,
				[],
				'Nao autorizado. Envie Authorization: Bearer <token> valido ou cookie de sessao valido.',
			);
			return;
		}

		req.user = sessionData.user as Record<string, unknown>;
		req.session = sessionData.session as Record<string, unknown>;
		next();
	} catch (error) {
		CommonResponse.error(
			res,
			HttpStatusCode.INTERNAL_SERVER_ERROR.code,
			'AUTH_CHECK_ERROR',
			null,
			[],
			'Erro ao verificar sessao',
		);
	}
}
