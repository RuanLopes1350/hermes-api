import chalk from 'chalk';
import { auth } from '../utils/auth';
import { createUserSchema, CreateUserInput } from '../utils/validation/userValidation';
import { isAPIError } from 'better-auth/api';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

// Criamos uma classe de erro customizada para o nosso domínio
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
	async createUser(data: unknown, headers?: HeadersInit) {
		console.log(chalk.blue.bold('[UserService] Validando e criando novo usuário...'));

		// 1. O Zod valida e tipa os dados. Se falhar, lança um ZodError automaticamente.
		const parsedData = createUserSchema.parse(data);

		try {
			// 2. Chamamos o Better Auth para criar o usuário e gerenciar o hash da senha
			const result = await auth.api.signUpEmail({
				body: {
					name: parsedData.name,
					email: parsedData.email,
					password: parsedData.password,
					...(parsedData.image ? { image: parsedData.image } : {}),
				},
				...(headers ? { headers } : {}), // Repassamos os headers para IP/UserAgent tracking
			});

			console.log(chalk.green.bold('[UserService] Usuário criado com sucesso no Better Auth!'));
			return result.user;
		} catch (error) {
			// 3. Tratamos os erros específicos do Better Auth
			if (isAPIError(error)) {
				// Código 422 geralmente indica que o email já está em uso no signUp
				if (error.statusCode === 422 || error.statusCode === HttpStatusCode.CONFLICT.code) {
					throw new UserServiceError(
						'Este email já está cadastrado.',
						HttpStatusCode.CONFLICT.code,
						'USER_ALREADY_EXISTS',
					);
				}
				throw new UserServiceError(
					error.message,
					error.statusCode || HttpStatusCode.BAD_REQUEST.code,
					'AUTH_API_ERROR',
				);
			}

			console.error(chalk.red.bold('[UserService] Erro desconhecido:'), error);
			throw new Error('Erro interno ao criar usuário.');
		}
	}
}

export default new UserService();
