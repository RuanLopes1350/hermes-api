import { Request, Response } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { auth } from '../utils/auth.js';
import {
	createUserSchema,
	updateUserSchema,
	adminUpdateUserSchema,
} from '../utils/validation/userValidation.js';
import { isAPIError } from 'better-auth/api';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import userRepository from '../repository/userRepository.js';
import { redisPub } from '../config/redisConfig.js';
import sessionStreamService from './sessionStreamService.js';
import presenceService from './presenceService.js';
import { UserType } from '../types/types.js';

// Motivos possíveis de invalidação de sessão publicados em `session:revoked:<userId>`.
type SessionRevokedReason = 'banned' | 'manual_revoke';

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
	async listUsers(currentUser?: UserType) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Listando usuários...`));
		if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') {
			throw new UserServiceError(
				'Acesso negado. Apenas administradores podem listar todos os usuários.',
				403,
				'FORBIDDEN',
			);
		}
		return userRepository.findAll();
	}

	// Busca um usuário pelo ID.
	// Um usuário comum só pode acessar seus próprios dados; admins podem acessar qualquer um.
	//
	async getUser(targetId: string, currentUser?: UserType) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Buscando usuário: ${targetId}`),
		);

		const requesterId = currentUser?.id;
		const requesterIsAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

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
	async updateUser(targetId: string, data: unknown, currentUser?: UserType) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Atualizando usuário: ${targetId}`),
		);

		const requesterId = currentUser?.id;
		const requesterIsAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

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

	// Atualiza permissões ou status (role, isActive). Exclusivo para administradores.
	//
	async adminUpdateUser(targetId: string, data: unknown, currentUser?: UserType) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [UserService] Admin atualizando usuário: ${targetId}`,
			),
		);

		const requesterIsAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

		if (!requesterIsAdmin) {
			throw new UserServiceError(
				'Apenas administradores podem promover usuários ou desativar contas.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedData = adminUpdateUserSchema.parse(data);

		const cleanedData = Object.fromEntries(
			Object.entries(parsedData).filter(([, value]) => value !== undefined),
		) as { role?: 'super_admin' | 'admin' | 'user'; isActive?: boolean };

		const updated = await userRepository.updateById(targetId, cleanedData);
		if (!updated) {
			throw new UserServiceError(
				'Usuário não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'USER_NOT_FOUND',
			);
		}

		if (cleanedData.isActive === false) {
			await this.revokeUserSessions(targetId, 'banned');
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [UserService] Usuário atualizado (Admin): ${targetId}`,
			),
		);
		return updated;
	}

	// Revoga todas as sessões ativas de um usuário (Postgres) e publica o evento
	// `session:revoked:<userId>` no Redis, para que uma conexão SSE aberta daquele
	// usuário force o logout imediatamente, sem esperar a próxima requisição.
	async revokeUserSessions(userId: string, reason: SessionRevokedReason) {
		await userRepository.deleteSessionsByUserId(userId);

		const payload = JSON.stringify({ reason, at: new Date().toISOString() });
		await redisPub.publish(`session:revoked:${userId}`, payload);

		console.log(
			chalk.yellow.bold(
				`[${getTimestamp()}] [INFO] [UserService] Sessões revogadas (${reason}): ${userId}`,
			),
		);
	}

	// GET /api/users/session-events (SSE)
	// Notifica em tempo real o próprio usuário autenticado quando sua sessão é revogada.
	streamSessionEvents(req: Request, res: Response) {
		const userId = req.user?.id;
		if (!userId) {
			res.status(HttpStatusCode.UNAUTHORIZED.code).end();
			return;
		}

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		presenceService.addConnection(userId, res);

		const channel = `session:revoked:${userId}`;
		const listener = (message: string) => {
			res.write(`data: ${message}\n\n`);
		};

		sessionStreamService.emitter.on(channel, listener);

		const keepAlive = setInterval(() => {
			try {
				res.write(': ping\n\n');
			} catch {
				// Ignora se o socket já fechou antes do interval limpar
			}
		}, 30000);

		req.on('close', () => {
			clearInterval(keepAlive);
			sessionStreamService.emitter.off(channel, listener);
			presenceService.removeConnection(userId, res);
			res.end();
		});
	}

	// GET /api/users/online — snapshot para popular o painel quando ele abre.
	// Restrito a administradores (mesmo padrão de checagem usado em listUsers/getAdminStats).
	async listOnlineUsers(currentUser?: UserType) {
		const requesterIsAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
		if (!requesterIsAdmin) {
			throw new UserServiceError(
				'Acesso negado. Apenas administradores podem ver quem está online.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const onlineIds = presenceService.getOnlineUserIds();
		return userRepository.findByIds(onlineIds);
	}

	// GET /api/users/presence-stream (SSE) - empurra "alguém entrou/saiu" em tempo real para os admins com o painel aberto. A checagem de admin acontece aqui
	// (dentro do service) e não no middleware, mesmo padrão de getAdminStats em dashboardService.ts - requireAuth garante só autenticação, não role.
	streamPresenceEvents(req: Request, res: Response) {
		const requesterIsAdmin = req.user?.role === 'super_admin' || req.user?.role === 'admin';
		if (!requesterIsAdmin) {
			res.status(HttpStatusCode.FORBIDDEN.code).end();
			return;
		}

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		presenceService.addListener(res);

		const keepAlive = setInterval(() => {
			try {
				res.write(': ping\n\n');
			} catch {
				// ignora se o socket já fechou antes do interval limpar
			}
		}, 30000);

		req.on('close', () => {
			clearInterval(keepAlive);
			presenceService.removeListener(res);
			res.end();
		});
	}

	// Deleta um usuário. Exclusivo para administradores.
	//
	async deleteUser(targetId: string, currentUser?: UserType) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [UserService] Deletando usuário: ${targetId}`),
		);

		if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') {
			throw new UserServiceError(
				'Acesso negado. Apenas administradores podem deletar usuários.',
				403,
				'FORBIDDEN',
			);
		}

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
