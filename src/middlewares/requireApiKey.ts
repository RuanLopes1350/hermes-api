import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { db } from '../config/dbConfig.js';
import { credential } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';

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
		// Extrai o prefixo público (parte antes do primeiro ".") para indexação rápida.
		// Formato esperado: hm_[prefixo].[segredo]
		const prefix = providedKey.split('.')[0];

		if (!prefix) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'INVALID_API_KEY',
				null,
				[],
				'API Key inválida ou revogada.',
			);
		}

		// Busca as credenciais candidatas pelo prefixo (rápido, indexado)
		const candidates = await db
			.select({
				id: credential.id,
				serviceId: credential.service_id,
				isActive: credential.is_active,
				expiresAt: credential.expiresAt,
				keyHash: credential.key_hash,
			})
			.from(credential)
			.where(
				and(
					eq(credential.prefix, prefix),
					eq(credential.is_active, true),
					isNull(credential.deletedAt),
				),
			);

		// Valida o segredo completo via Argon2 apenas para as candidatas encontradas
		let validCred: (typeof candidates)[number] | undefined;
		for (const candidate of candidates) {
			if (await argon2.verify(candidate.keyHash, providedKey)) {
				validCred = candidate;
				break;
			}
		}

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
