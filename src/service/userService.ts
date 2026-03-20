import { UserType } from '../types/types';
import { userSchema } from '../utils/validation/userValidation';
import { ZodError } from 'zod';
import chalk from 'chalk';
import { auth } from '../utils/auth';
import HttpStatusCode from '../utils/helpers/httpStatusCode';
import { isAPIError } from 'better-auth/api';

export class UserServiceError extends Error {
	public readonly statusCode: number;
	public readonly errorCode: string;

	constructor(message: string, statusCode: number, errorCode: string) {
		super(message);
		this.name = 'UserServiceError';
		this.statusCode = statusCode;
		this.errorCode = errorCode;
	}
}

class UserService {
	async createUser(userData: UserType, headers?: HeadersInit): Promise<UserType> {
		console.log(chalk.blue.bold('[UserService] [createUser] Validando dados do usuário...'));
		try {
			const parsedUserData = userSchema.parse(userData);

			console.log(chalk.blue.bold('[UserService] [createUser] Criando usuário via Better Auth...'));
			const result = await auth.api.signUpEmail({
				body: {
					name: parsedUserData.name,
					email: parsedUserData.email,
					password: parsedUserData.password ?? '',
					...(parsedUserData.image ? { image: parsedUserData.image } : {}),
				},
				...(headers ? { headers } : {}),
			});

			const createdUser = result.user as UserType;
			console.log(chalk.green.bold('[UserService] [createUser] Usuário criado com sucesso!'));
			return createdUser;
		} catch (error) {
			if (error instanceof ZodError) {
				throw error;
			}

			if (isAPIError(error)) {
				if (error.statusCode === HttpStatusCode.UNPROCESSABLE_ENTITY.code) {
					throw new UserServiceError('Email já cadastrado.', HttpStatusCode.CONFLICT.code, 'USER_ALREADY_EXISTS');
				}

				throw new UserServiceError(
					error.message,
					error.statusCode || HttpStatusCode.BAD_REQUEST.code,
					'BETTER_AUTH_SIGNUP_ERROR',
				);
			}

			console.error(chalk.red.bold('[UserService] [createUser] Erro ao criar usuário:'), error);

			throw new Error('Erro ao criar usuário. Por favor, tente novamente.');
		}
	}
}

export default UserService;
