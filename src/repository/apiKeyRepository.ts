import { db } from '../config/dbConfig.js';
import { api_key } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class ApiKeyRepository {
	// Insere uma nova API Key no banco.
	async createApiKey(data: {
		name: string;
		keyHash: string;
		prefix: string;
		serviceId: string;
		expiresAt?: Date | null;
	}) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ApiKeyRepository] Inserindo nova API Key...`),
		);
		try {
			const [newApiKey] = await db
				.insert(api_key)
				.values({
					id: uuidv4(),
					name: data.name,
					key_hash: data.keyHash,
					prefix: data.prefix,
					service_id: data.serviceId,
					expiresAt: data.expiresAt ?? null,
				})
				.returning();
			return newApiKey;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.createApiKey');
		}
	}

	// Lista todas as API Keys ativas (não soft-deletadas) de um serviço.
	// O campo `key_hash` é excluído da resposta por segurança.
	async findAllByService(serviceId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ApiKeyRepository] Listando keys do serviço: ${serviceId}`,
			),
		);
		try {
			return await db
				.select({
					id: api_key.id,
					name: api_key.name,
					prefix: api_key.prefix,
					service_id: api_key.service_id,
					is_active: api_key.is_active,
					last_used_at: api_key.last_used_at,
					expiresAt: api_key.expiresAt,
					notification_sent_at: api_key.notification_sent_at,
					createdAt: api_key.createdAt,
				})
				.from(api_key)
				.where(and(eq(api_key.service_id, serviceId), isNull(api_key.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.findAllByService');
		}
	}

	// Busca uma API Key ativa por ID.
	// O campo `key_hash` é excluído da resposta por segurança.
	async findById(id: string) {
		console.log(chalk.magenta(`[${getTimestamp()}] [DB] [ApiKeyRepository] Buscando key: ${id}`));
		try {
			const [found] = await db
				.select({
					id: api_key.id,
					name: api_key.name,
					prefix: api_key.prefix,
					service_id: api_key.service_id,
					is_active: api_key.is_active,
					last_used_at: api_key.last_used_at,
					expiresAt: api_key.expiresAt,
					notification_sent_at: api_key.notification_sent_at,
					createdAt: api_key.createdAt,
				})
				.from(api_key)
				.where(and(eq(api_key.id, id), isNull(api_key.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.findById');
		}
	}

	// Atualiza nome e/ou status ativo de uma API Key.
	async updateById(
		id: string,
		data: { name?: string; is_active?: boolean; expiresAt?: Date | null },
	) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ApiKeyRepository] Atualizando key: ${id}`),
		);
		try {
			const [updated] = await db
				.update(api_key)
				.set(data)
				.where(and(eq(api_key.id, id), isNull(api_key.deletedAt)))
				.returning({
					id: api_key.id,
					name: api_key.name,
					prefix: api_key.prefix,
					service_id: api_key.service_id,
					is_active: api_key.is_active,
					last_used_at: api_key.last_used_at,
					expiresAt: api_key.expiresAt,
					notification_sent_at: api_key.notification_sent_at,
					createdAt: api_key.createdAt,
				});
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.updateById');
		}
	}

	// Soft delete da API Key (revogação sem perda de histórico).
	async softDeleteById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ApiKeyRepository] Soft delete da key: ${id}`),
		);
		try {
			const [deleted] = await db
				.update(api_key)
				.set({ deletedAt: new Date(), is_active: false })
				.where(and(eq(api_key.id, id), isNull(api_key.deletedAt)))
				.returning({ id: api_key.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.softDeleteById');
		}
	}
}

export default new ApiKeyRepository();
