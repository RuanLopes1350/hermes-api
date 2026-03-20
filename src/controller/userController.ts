import UserService from '../service/userService';
import { Request, Response } from 'express';
import { UserType } from '../types/types';
import chalk from 'chalk';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { ZodError } from 'zod';
import { UserServiceError } from '../service/userService';

class UserController {
	private service: UserService;

	constructor() {
		this.service = new UserService();
	}

	async createUser(req: Request, res: Response) {
		console.log(
			chalk.blue.bold('[UserController] [createUser] Recebendo requisição para criar usuário...'),
		);

		const { name, email, password } = req.body as Partial<UserType>;
		const missingFields = [
			!name ? 'name' : null,
			!email ? 'email' : null,
			!password ? 'password' : null,
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
			const userData: UserType = req.body;
			const normalizedHeaders = Object.entries(req.headers).reduce<Record<string, string>>(
				(acc, [key, value]) => {
					if (typeof value === 'string') {
						acc[key] = value;
					} else if (Array.isArray(value)) {
						acc[key] = value.join(',');
					}
					return acc;
				},
				{},
			);

			const createdUser = await this.service.createUser(userData, normalizedHeaders);
			console.log(
				chalk.green.bold(
					'[UserController] [createUser] Usuário criado com sucesso! Enviando resposta...',
				),
			);
			return CommonResponse.created(res, createdUser, 'Usuário criado com sucesso!');
		} catch (error) {
			console.error(chalk.red.bold('[UserController] [createUser] Erro ao criar usuário:'), error);
			if (error instanceof UserServiceError) {
				return CommonResponse.error(
					res,
					error.statusCode,
					error.errorCode,
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

	async getMe(req: Request, res: Response) {
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

		return CommonResponse.success(
			res,
			{
				user: req.user,
				session: req.session,
			},
			HttpStatusCode.OK.code,
			'Sessao recuperada com sucesso.',
		);
	}
}

export default UserController;
