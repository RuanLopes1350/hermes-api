import ApiKeyService from '../service/apiKeyService';
import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/helpers/dbErrors';
import { ZodError } from 'zod';

class ApiKeyController {
	private service: ApiKeyService;

	constructor() {
		this.service = new ApiKeyService();
	}

	async createApiKey(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.blue.bold(
				'[ApiKeyController] [createApiKey] Recebendo requisição para criar chave de API...',
			),
		);

		const { name, prefix, service_id } = req.body;
		const missingFields = [
			!name ? 'name' : null,
			!prefix ? 'prefix' : null,
			!service_id ? 'service_id' : null,
		].filter(Boolean);

		if (missingFields.length > 0) {
			return CommonResponse.error(
				res,
				HttpStatusCode.BAD_REQUEST.code,
				'MISSING_REQUIRED_FIELDS',
				null,
				missingFields,
				`Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
			);
		}

		try {
			const apiKeyData = req.body;
			const createdApiKey = await this.service.createApiKey(apiKeyData);
			console.log(
				chalk.green.bold('[ApiKeyController] [createApiKey] Chave de API criada com sucesso!'),
			);
			return CommonResponse.created(res, createdApiKey, 'Chave de API criada com sucesso!');
		} catch (error) {
			console.error(
				chalk.red.bold('[ApiKeyController] [createApiKey] Erro ao criar chave de API:'),
				error,
			);
			if (error instanceof DatabaseError) {
				return CommonResponse.error(
					res,
					error.statusCode,
					'DATABASE_ERROR',
					null,
					[],
					error.message,
				);
			}

			if (error instanceof ZodError) {
				return CommonResponse.error(
					res,
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'VALIDATION_ERROR',
					null,
					error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
					'Dados inválidos para criação de usuário.',
				);
			}

			return CommonResponse.error(
				res,
				HttpStatusCode.INTERNAL_SERVER_ERROR.code,
				'CREATE_USER_ERROR',
				null,
				[],
				'Erro ao criar usuário. Por favor, tente novamente.',
			);
		}
	}
}

export default ApiKeyController;