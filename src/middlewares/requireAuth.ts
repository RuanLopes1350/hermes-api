import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

// Extende o Request do Express para armazenar os dados de autenticação resolvidos.
declare global {
	namespace Express {
		interface Request {
			user?: Record<string, unknown>;
			session?: Record<string, unknown>;
		}
	}
}

// Tenta resolver sessão usando todos os headers da requisição.
export async function getSession(req: Request) {
	return auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});
}

// Permite tentativas de autenticação com headers específicos (fallbacks).
async function getSessionFromHeaders(headers: HeadersInit) {
	return auth.api.getSession({ headers });
}

// Garante que rotas protegidas só avancem com sessão válida.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		// Primeira tentativa: valida a sessão usando o conjunto completo de headers.
		let sessionData = await getSession(req);

		// Se não houver sessão, tenta alternativas por Authorization e Cookie.
		if (!sessionData?.user || !sessionData?.session) {
			const authorizationHeader = req.headers.authorization;
			const cookieHeader = req.headers.cookie;

			// Fallback 1: sessão via Authorization Bearer.
			if (typeof authorizationHeader === 'string' && authorizationHeader.trim().length > 0) {
				sessionData = await getSessionFromHeaders({ authorization: authorizationHeader });
			}

			// Fallback 2: sessão via Cookie, incluindo Origin quando disponível.
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

		// Sem sessão válida: devolve 401 e registra informações úteis para depuração.
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

		// Com sessão válida, injeta os dados no request para os próximos handlers.
		req.user = sessionData.user as Record<string, unknown>;
		req.session = sessionData.session as Record<string, unknown>;
		next();
	} catch (error) {
		// Qualquer erro inesperado de autenticação retorna 500 padronizado.
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
