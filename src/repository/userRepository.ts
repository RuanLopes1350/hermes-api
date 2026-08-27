import { db } from '../config/dbConfig.js';
import { user } from '../config/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class UserRepository {
	// Retorna todos os usuários cadastrados.
	// Exclusivo para administradores — nunca retornar senhas.
	async findAll() {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [UserRepository] Buscando todos os usuários...`),
		);
		try {
			return await db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					role: user.role,
					isActive: user.isActive,
					image: user.image,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				})
				.from(user);
		} catch (error) {
			throw parseDatabaseError(error, 'UserRepository.findAll');
		}
	}

	// Busca um usuário pelo ID, sem retornar a senha.
	async findById(id: string) {
		console.log(chalk.magenta(`[${getTimestamp()}] [DB] [UserRepository] Buscando usuário: ${id}`));
		try {
			const [found] = await db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					role: user.role,
					isActive: user.isActive,
					image: user.image,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				})
				.from(user)
				.where(eq(user.id, id))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'UserRepository.findById');
		}
	}

	// Atualiza campos permitidos do usuário (name, image, role, isActive).
	// Email e senha são gerenciados pelo Better Auth, não por aqui.
	async updateById(
		id: string,
		data: {
			name?: string;
			image?: string;
			role?: 'super_admin' | 'admin' | 'user';
			isActive?: boolean;
		},
	) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [UserRepository] Atualizando usuário: ${id}`),
		);
		try {
			const [updated] = await db
				.update(user)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(user.id, id))
				.returning({
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					role: user.role,
					isActive: user.isActive,
					image: user.image,
					updatedAt: user.updatedAt,
				});
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'UserRepository.updateById');
		}
	}

	// Deleta um usuário permanentemente.
	// Sessions e accounts são removidas em cascata pelo banco (FK Better Auth).
	async deleteById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [UserRepository] Deletando usuário: ${id}`),
		);
		try {
			const [deleted] = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'UserRepository.deleteById');
		}
	}

	// Busca vários usuários por ID de uma vez (usado para resolver o snapshot de presença: presenceService só sabe os IDs, isso traz nome/e-mail/avatar)
	async findByIds(ids: string[]) {
		if (ids.length === 0) return [];
		console.log(
			chalk.magenta(
				`[${getTimestamp}] [DB] [UserRepository] Buscando ${ids.length} usuário(s) por ID...`,
			),
		);
		try {
			return await db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					image: user.image,
				})
				.from(user)
				.where(inArray(user.id, ids));
		} catch (error) {
			throw parseDatabaseError(error, 'UserRepository.findByIds');
		}
	}
}

export default new UserRepository();
