import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import chalk from 'chalk';
import { auth } from '../utils/auth.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
// Se você tiver o UserType exportado em algum lugar, pode importar aqui.
// Caso contrário, a interface abaixo resolve perfeitamente.

// 1. Tipagem Forte: Extende o Request do Express para o TypeScript parar de reclamar
declare global {
	namespace Express {
		interface Request {
			// Definimos explicitamente os campos que sabemos que o Better Auth devolve
			user?: {
				id: string;
				name: string;
				email: string;
				emailVerified: boolean;
				isAdmin: boolean | null; // Better Auth pode retornar null quando não configurado
				image?: string | null;
				createdAt: Date;
				updatedAt: Date;
			};
			session?: {
				id: string;
				expiresAt: Date;
				token: string;
				ipAddress?: string | null;
				userAgent?: string | null;
				userId: string;
			};
		}
	}
}

// Tenta resolver sessão usando os headers formatados para o padrão Web
export async function getSession(req: Request) {
	return auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});
}

// Garante que rotas protegidas só avancem com sessão válida
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		// A chamada principal com fromNodeHeaders geralmente já pega Cookies e Bearer Tokens
		let sessionData = await getSession(req);

		// Fallback de segurança (sua lógica original mantida e simplificada)
		if (!sessionData?.user || !sessionData?.session) {
			const authHeader = req.headers.authorization;
			const cookieHeader = req.headers.cookie;

			if (authHeader) {
				sessionData = await auth.api.getSession({
					headers: new Headers({ authorization: authHeader }),
				});
			} else if (cookieHeader) {
				const headers = new Headers({ cookie: cookieHeader });
				if (req.headers.origin) headers.append('origin', req.headers.origin as string);
				sessionData = await auth.api.getSession({ headers });
			}
		}

		// Se após as tentativas não houver sessão, bloqueia com 401
		if (!sessionData?.user || !sessionData?.session) {
			console.warn(chalk.yellow(`[requireAuth] Acesso negado. Rota: ${req.originalUrl}`));

			// Aqui usamos return para encerrar a execução imediatamente
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

		// 2. Injeta os dados fortemente tipados no request para os Controllers usarem
		req.user = {
			...sessionData.user,
			isAdmin: !!sessionData.user.isAdmin,
		};
		req.session = sessionData.session;

		// Passa para o próximo middleware ou controller
		next();
	} catch (error) {
		console.error(chalk.red('[requireAuth] Erro interno ao verificar sessão:'), error);
		// 3. Deixamos o Error Handler Global lidar com o erro 500
		next(error);
	}
}
