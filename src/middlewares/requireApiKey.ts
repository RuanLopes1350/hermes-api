import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { db } from '../config/dbConfig.js';
import { api_key, service } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

// Estendendo o Request para incluir os dados da Key e da Credencial Vinculada
declare global {
	namespace Express {
		interface Request {
			apiKeyId?: string;
			serviceId?: string;
			credentialId?: string; // NOVO: Carimbado pela API Key
		}
	}
}

/**
 * Middleware para validar a API Key enviada no header 'X-API-Key'.
 * Agora ele também identifica automaticamente qual Credencial deve ser usada.
 */
export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
	const providedKey = req.headers['x-api-key'] as string;

	if (!providedKey) {
		console.warn(chalk.yellow(`[${getTimestamp()}] [requireApiKey] API Key ausente.`));
		return CommonResponse.error(
			res,
			HttpStatusCode.UNAUTHORIZED.code,
			'API_KEY_MISSING',
			null,
			[],
			'Acesso negado. Forneça uma API Key válida no header X-API-Key.',
		);
	}

	try {
		// 1. Extrai o prefixo (hm_xxxx) para busca rápida
		const [prefix] = providedKey.split('.');
		if (!prefix) throw new Error('Formato de chave inválido.');

		// 2. Busca keys ativas com esse prefixo
		const foundKeys = await db
			.select({
				id: api_key.id,
				keyHash: api_key.key_hash,
				serviceId: api_key.service_id,
				credentialId: api_key.credential_id, // BUSCA O VÍNCULO
				isActive: api_key.is_active,
				expiresAt: api_key.expiresAt,
			})
			.from(api_key)
			.where(and(eq(api_key.prefix, prefix), eq(api_key.is_active, true), isNull(api_key.deletedAt)));

		let validKey = null;

		// 3. Verifica o hash Argon2 para cada chave encontrada
		for (const key of foundKeys) {
			const isMatch = await argon2.verify(key.keyHash, providedKey);
			if (isMatch) {
				validKey = key;
				break;
			}
		}

		if (!validKey) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY',
				null,
				[],
				'API Key inválida ou revogada.',
			);
		}

		// 4. Verifica expiração
		if (validKey.expiresAt && new Date() > new Date(validKey.expiresAt)) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'API_KEY_EXPIRED',
				null,
				[],
				'Esta API Key expirou.',
			);
		}

		// 5. Injeta os dados no request
		// Agora o sistema sabe exatamente qual Serviço e qual Credencial usar
		req.apiKeyId = validKey.id;
		req.serviceId = validKey.serviceId;
		req.credentialId = validKey.credentialId;

		console.log(
			chalk.green(
				`[${getTimestamp()}] [AUTH] API Key validada. key_id="${validKey.id}" service_id="${validKey.serviceId}" credential_id="${validKey.credentialId}"`,
			),
		);

		next();
	} catch (error) {
		console.error(chalk.red.bold(`[${getTimestamp()}] [ERROR] [requireApiKey] Erro interno:`), error);
		next(error);
	}
}
