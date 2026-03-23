import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { auth } from '../utils/auth.js';
import { createUserSchema, updateUserSchema } from '../utils/validation/userValidation.js';
import { isAPIError } from 'better-auth/api';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import userRepository from '../repository/userRepository.js';

// Erro de domínio para o contexto de usuário
export class UserServiceError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'UserServiceError';
	}
}

class UserService {
	// Cria um novo usuário via Better Auth (gerencia hash de senha, sessão, etc.).
	//
	async createUser(data: unknown, headers?: HeadersInit) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [UserService] Validando e criando novo usuário...`,
			),
		);

		const parsedData = createUserSchema.parse(data);

		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: parsedData.name,
					email: parsedData.email,
					password: parsedData.password,
					...(parsedData.image ? { image: parsedData.image } : {}),
				},
				...(headers ? { headers } : {}),
			});

			console.log(
				chalk.green.bold(
					`[${getTimestamp()}] [SUCCESS] [UserService] Usuário criado: ${result.user.email}`,
				),
			);
			return result.user;
		} catch (error) {
			if (isAPIError(error)) {
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
			console.error(
				chalk.red.bold(`[${getTimestamp()}] [ERROR] [UserService] Erro desconhecido:`),
				error,
			);
			throw new Error('Erro interno ao criar usuário.');
		}
	}

	// Lista todos os usuários. Acesso restrito a administradores.
	//
	async listUsers() {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Listando usuários...`));
		return userRepository.findAll();
	}

	// Busca um usuário pelo ID.
	// Um usuário comum só pode acessar seus próprios dados; admins podem acessar qualquer um.
	//
	async getUser(targetId: string, requesterId: string, requesterIsAdmin: boolean) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Buscando usuário: ${targetId}`),
		);

		// Não-admins só podem ver os próprios dados
		if (!requesterIsAdmin && targetId !== requesterId) {
			throw new UserServiceError(
				'Você não tem permissão para acessar dados de outro usuário.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const found = await userRepository.findById(targetId);
		if (!found) {
			throw new UserServiceError(
				'Usuário não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'USER_NOT_FOUND',
			);
		}
		return found;
	}

	// Atualiza nome e/ou imagem do usuário.
	// Email e senha são gerenciados pelo Better Auth.
	//
	async updateUser(
		targetId: string,
		data: unknown,
		requesterId: string,
		requesterIsAdmin: boolean,
	) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Atualizando usuário: ${targetId}`),
		);

		if (!requesterIsAdmin && targetId !== requesterId) {
			throw new UserServiceError(
				'Você não tem permissão para alterar dados de outro usuário.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedData = updateUserSchema.parse(data);

		const cleanedData = Object.fromEntries(
			Object.entries(parsedData).filter(([, value]) => value !== null),
		) as { name?: string; image?: string };

		const updated = await userRepository.updateById(targetId, cleanedData);
		if (!updated) {
			throw new UserServiceError(
				'Usuário não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'USER_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [UserService] Usuário atualizado: ${targetId}`,
			),
		);
		return updated;
	}

	// Deleta um usuário. Exclusivo para administradores.
	//
	async deleteUser(targetId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Deletando usuário: ${targetId}`),
		);

		const deleted = await userRepository.deleteById(targetId);
		if (!deleted) {
			throw new UserServiceError(
				'Usuário não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'USER_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [UserService] Usuário deletado: ${targetId}`),
		);
		return { id: deleted.id };
	}
}

export default new UserService();
