import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { db } from '../config/dbConfig.js';
import { api_key, service } from '../config/db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

// Tipagem injetada no Request para controllers que usam autenticação por API Key
declare global {
	namespace Express {
		interface Request {
			apiKey?: {
				id: string;
				name: string;
				prefix: string;
				serviceId: string;
				isActive: boolean;
			};
			apiKeyService?: {
				id: string;
				name: string;
				ownerId: string;
			};
		}
	}
}

//
// Middleware de autenticação por API Key.
// Lê o header `X-API-Key`, extrai o prefixo (antes do ponto),
// busca a key no banco e valida o hash com Argon2.
// Uso: rotas de consumo externo (ex: envio de e-mail).
// Injeta `req.apiKey` e `req.apiKeyService` para uso nos controllers.

export async function requireApiKey(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const rawKey = req.headers['x-api-key'];

		// Header ausente
		if (!rawKey || typeof rawKey !== 'string') {
			console.warn(
				chalk.yellow.bold(
					`[${getTimestamp()}] [WARN] [requireApiKey] Header X-API-Key ausente. Rota: ${req.originalUrl}`,
				),
			);
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'MISSING_API_KEY',
				null,
				[],
				'Autenticação por API Key obrigatória. Envie o header X-API-Key.',
			);
			return;
		}

		// Formato esperado: "hm_PREFIXO.SEGREDO"
		const dotIndex = rawKey.indexOf('.');
		if (dotIndex === -1) {
			console.warn(
				chalk.yellow.bold(
					`[${getTimestamp()}] [WARN] [requireApiKey] Formato de API Key inválido. Rota: ${req.originalUrl}`,
				),
			);
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY_FORMAT',
				null,
				[],
				'Formato de API Key inválido.',
			);
			return;
		}

		const prefix = rawKey.substring(0, dotIndex);

		// Busca a key pelo prefixo (não pelo hash — o prefixo é público e indexável)
		const [foundKey] = await db.select().from(api_key).where(eq(api_key.prefix, prefix)).limit(1);

		if (!foundKey) {
			console.warn(
				chalk.yellow.bold(
					`[${getTimestamp()}] [WARN] [requireApiKey] API Key não encontrada para prefixo: ${prefix}`,
				),
			);
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY',
				null,
				[],
				'API Key inválida ou inexistente.',
			);
			return;
		}

		// Verificar se a key foi soft-deletada
		if (foundKey.deletedAt !== null) {
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'API_KEY_REVOKED',
				null,
				[],
				'Esta API Key foi revogada.',
			);
			return;
		}

		// Verificar se a key está ativa
		if (!foundKey.is_active) {
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'API_KEY_INACTIVE',
				null,
				[],
				'Esta API Key está desativada.',
			);
			return;
		}

		// Verificar expiração e Grace Period (<= 7 dias)
		if (foundKey.expiresAt) {
			const now = new Date();
			const expiresAt = new Date(foundKey.expiresAt);

			if (expiresAt < now) {
				CommonResponse.error(
					res,
					HttpStatusCode.UNAUTHORIZED.code,
					'API_KEY_EXPIRED',
					null,
					[],
					'Esta API Key expirou.',
				);
				return;
			}

			// Injetar headers de aviso se faltarem 7 dias ou menos
			const diffTime = expiresAt.getTime() - now.getTime();
			const diffDays = diffTime / (1000 * 3600 * 24);
			if (diffDays <= 7) {
				res.setHeader('Warning', '199 - "API Key is expiring soon"');
				res.setHeader('X-API-Key-Expires-At', expiresAt.toISOString());
			}
		}

		// Validar o hash com Argon2 (comparação constante, resistente a timing attacks)
		const isValid = await argon2.verify(foundKey.key_hash, rawKey);
		if (!isValid) {
			console.warn(
				chalk.yellow.bold(
					`[${getTimestamp()}] [WARN] [requireApiKey] Hash inválido para prefixo: ${prefix}`,
				),
			);
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY',
				null,
				[],
				'API Key inválida.',
			);
			return;
		}

		// Buscar o serviço associado à key (verificando soft delete)
		const [foundService] = await db
			.select()
			.from(service)
			.where(eq(service.id, foundKey.service_id))
			.limit(1);

		if (!foundService || foundService.deletedAt !== null) {
			CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'SERVICE_NOT_FOUND',
				null,
				[],
				'O serviço associado a esta API Key não existe ou foi removido.',
			);
			return;
		}

		// Atualizar last_used_at de forma assíncrona (sem bloquear a requisição)
		db.update(api_key)
			.set({ last_used_at: new Date() })
			.where(eq(api_key.id, foundKey.id))
			.catch((err) =>
				console.error(
					chalk.red(`[${getTimestamp()}] [ERROR] [requireApiKey] Falha ao atualizar last_used_at:`),
					err,
				),
			);

		// Injetar dados no request para uso nos controllers
		req.apiKey = {
			id: foundKey.id,
			name: foundKey.name,
			prefix: foundKey.prefix,
			serviceId: foundKey.service_id,
			isActive: foundKey.is_active,
		};
		req.apiKeyService = {
			id: foundService.id,
			name: foundService.name,
			ownerId: foundService.owner_id,
		};

		console.log(
			chalk.green(
				`[${getTimestamp()}] [INFO] [requireApiKey] Autenticado: key="${foundKey.name}" service="${foundService.name}"`,
			),
		);

		next();
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] [requireApiKey] Erro interno:`),
			error,
		);
		next(error);
	}
}
