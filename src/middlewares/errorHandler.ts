import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import chalk from 'chalk';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { UserServiceError } from '../service/userService';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
	console.error(
		chalk.red.bold(`[ErrorHandler] Erro capturado na rota ${req.originalUrl}:`),
		err.message || err,
	);

	// Se o erro veio do Zod (validação falhou)
	if (err instanceof ZodError) {
		const missingFields = err.issues.map((issue) => issue.path.join('.'));
		return CommonResponse.error(
			res,
			HttpStatusCode.UNPROCESSABLE_ENTITY.code,
			'VALIDATION_ERROR',
			null,
			err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
			`Dados inválidos. Verifique os campos: ${missingFields.join(', ')}`,
		);
	}

	// Se o erro veio das nossas regras de negócio no Service
	if (err instanceof UserServiceError) {
		return CommonResponse.error(res, err.statusCode, err.errorCode, null, [], err.message);
	}

	// Erro genérico (Banco de dados fora do ar, erro de sintaxe não mapeado, etc)
	return CommonResponse.error(
		res,
		HttpStatusCode.INTERNAL_SERVER_ERROR.code,
		'INTERNAL_SERVER_ERROR',
		null,
		[],
		'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
	);
};
