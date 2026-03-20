import ServiceService from '../service/serviceService';
import { Request, Response } from 'express';
import { ServiceType } from '../types/types';
import chalk from 'chalk';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { DatabaseError } from '../utils/helpers/dbErrors';
import { ZodError } from 'zod';

class ServiceController {
	private service: ServiceService;

	constructor() {
		this.service = new ServiceService();
	}

	async createService(req: Request, res: Response) {
		console.log(
			chalk.blue.bold(
				'[ServiceController] [createService] Recebendo requisição para criar serviço...',
			),
		);

		if (!req.user || !req.session) {
			return CommonResponse.error(
				res,
				HttpStatusCode.UNAUTHORIZED.code,
				'UNAUTHORIZED',
				null,
				[],
				'Sessao invalida ou expirada.',
			);
		}

		const { name } = req.body as Partial<ServiceType>;
		const missingFields = [!name ? 'name' : null].filter(Boolean);

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
			const loggedUserId = req.user.id;

			if (typeof loggedUserId !== 'string' || loggedUserId.length === 0) {
				return CommonResponse.error(
					res,
					HttpStatusCode.UNAUTHORIZED.code,
					'INVALID_SESSION_USER',
					null,
					[],
					'ID do usuario autenticado nao encontrado na sessao.',
				);
			}

			const { settings } = req.body as Partial<ServiceType>;
			const createdService = await this.service.createService(
				{ name: name as string, settings },
				loggedUserId,
			);
			console.log(
				chalk.green.bold(
					'[ServiceController] [createService] Serviço criado com sucesso! Enviando resposta...',
				),
			);
			return CommonResponse.created(res, createdService, 'Serviço criado com sucesso!');
		} catch (error) {
			console.error(
				chalk.red.bold('[ServiceController] [createService] Erro ao criar serviço:'),
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
				'INTERNAL_SERVER_ERROR',
				null,
				[],
				'Erro ao criar serviço. Por favor, tente novamente.',
			);
		}
	}
}

export default ServiceController;
