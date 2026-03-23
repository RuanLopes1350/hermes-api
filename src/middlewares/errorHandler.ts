import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import CommonResponse from '../utils/helpers/commonResponse.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DatabaseError } from '../utils/helpers/dbErrors.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
	console.error(
		chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro capturado na rota ${req.originalUrl}:`),
		err.message || err,
	);

	// Erros de validação do Zod
	if (err instanceof ZodError) {
		const issues = err.issues.map((issue) => ({
			field: issue.path.join('.'),
			message: issue.message,
		}));
		const missingFields = issues.map((i) => i.field).join(', ');
		return CommonResponse.error(
			res,
			HttpStatusCode.UNPROCESSABLE_ENTITY.code,
			'VALIDATION_ERROR',
			null,
			issues,
			`Dados inválidos. Verifique os campos: ${missingFields}`,
		);
	}

	// Erros de banco de dados mapeados (DatabaseError do dbErrors.ts)
	if (err instanceof DatabaseError) {
		return CommonResponse.error(
			res,
			err.statusCode,
			'DATABASE_ERROR',
			null,
			err.detail ? [{ detail: err.detail, constraint: err.constraint }] : [],
			err.message,
		);
	}

	// Erros de domínio genéricos (qualquer Service que lance erro com statusCode + errorCode)
	// Isso cobre: UserServiceError, ServiceDomainError, e quaisquer novos DomainErrors futuros
	if (err?.statusCode && err?.errorCode) {
		return CommonResponse.error(res, err.statusCode, err.errorCode, null, [], err.message);
	}

	// Erro interno genérico (banco fora do ar, exceção não mapeada, etc.)
	return CommonResponse.error(
		res,
		HttpStatusCode.INTERNAL_SERVER_ERROR.code,
		'INTERNAL_SERVER_ERROR',
		null,
		[],
		'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
	);
};
