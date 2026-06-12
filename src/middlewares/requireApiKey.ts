import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { db } from '../config/dbConfig.js';
import { credential } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

declare global {
	namespace Express {
		interface Request {
			serviceId?: string;
			credentialId?: string;
		}
	}
}

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
		// Calcula o SHA256 da chave fornecida
		const hash = crypto.createHash('sha256').update(providedKey).digest('hex');

		// Busca a credencial pelo hash da chave
		const [validCred] = await db
			.select({
				id: credential.id,
				serviceId: credential.service_id,
				isActive: credential.is_active,
				expiresAt: credential.expiresAt,
			})
			.from(credential)
			.where(
				and(
					eq(credential.key_hash, hash),
					eq(credential.is_active, true),
					isNull(credential.deletedAt)
				)
			)
			.limit(1);

		if (!validCred) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY',
				null,
				[],
				'API Key inválida ou revogada.',
			);
		}

		if (validCred.expiresAt && new Date() > new Date(validCred.expiresAt)) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'API_KEY_EXPIRED',
				null,
				[],
				'Esta API Key expirou.',
			);
		}

		// Injeta os dados no request
		req.serviceId = validCred.serviceId;
		req.credentialId = validCred.id;

		console.log(
			chalk.green(
				`[${getTimestamp()}] [AUTH] API Key validada. service_id="${validCred.serviceId}" credential_id="${validCred.id}"`,
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
