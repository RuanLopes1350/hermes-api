import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import chalk from 'chalk';
import { auth } from '../utils/auth.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

export async function getSession(req: ExpressRequest) {
	try {
		const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
		const host = req.headers['x-forwarded-host'] || req.headers.host;
		const url = `${protocol}://${host}${req.originalUrl}`;

		const webReq = new Request(url, {
			method: req.method,
			headers: fromNodeHeaders(req.headers),
		});

		console.log(`[DEBUG getSession] URL construída: ${url}`);
		console.log(`[DEBUG getSession] Cookie enviado:`, webReq.headers.get('cookie')?.substring(0, 50) + '...');

		const result = await auth.api.getSession({
			request: webReq,
			headers: webReq.headers,
		});

		console.log(`[DEBUG getSession] Result type:`, result instanceof Response ? `Response (${result.status})` : typeof result);
		
		if (result instanceof Response) {
			if (result.status !== 200) {
				console.log(`[DEBUG getSession] Response não-200. Body:`, await result.text().catch(() => ''));
				return null;
			}
			return await result.json();
		}

		console.log(`[DEBUG getSession] Result (se null, falhou):`, result ? 'SUCCESS' : 'NULL');
		return result;
	} catch (err) {
		console.error('[requireAuth] Erro:', err);
		return null;
	}
}

// Garante que rotas protegidas só avancem com sessão válida
export async function requireAuth(req: ExpressRequest, res: ExpressResponse, next: NextFunction): Promise<void> {
	try {
		const sessionData = await getSession(req);

		if (!sessionData?.user || !sessionData?.session) {
			console.warn(chalk.yellow(`[requireAuth] Acesso negado. Rota: ${req.originalUrl}`));

			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'UNAUTHORIZED',
				null,
				[],
				'Não autorizado. Envie um token Bearer ou Cookie de sessão válido.',
			);
			return;
		}

		// Injeta os dados fortemente tipados no request para os Controllers usarem
		req.user = {
			...sessionData.user,
			role: (sessionData.user.role as 'super_admin' | 'admin' | 'user') ?? 'user',
			isActive: sessionData.user.isActive !== false,
		};
		req.session = sessionData.session;

		if (!req.user!.isActive) {
			console.warn(
				chalk.yellow(`[requireAuth] Acesso bloqueado para usuário inativo: ${req.user!.email}`),
			);
			CommonResponse.error(
				res,
				HttpStatusCode.FORBIDDEN.code,
				'ACCOUNT_INACTIVE',
				null,
				[],
				'Esta conta foi desativada pelo administrador.',
			);
			return;
		}

		next();
	} catch (error) {
		console.error(chalk.red('[requireAuth] Erro interno ao verificar sessão:'), error);
		next(error);
	}
}
