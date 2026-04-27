import { db } from '../config/dbConfig.js';
import { api_key, service } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class ApiKeyRepository {
	// Cria uma nova API Key vinculada a um serviço e credencial.
	async createApiKey(data: {
		name: string;
		keyHash: string;
		prefix: string;
		serviceId: string;
		credentialId: string;
		expiresAt: Date | null;
	}) {
		try {
			const [newKey] = await db
				.insert(api_key)
				.values({
					id: uuidv4(),
					name: data.name,
					key_hash: data.keyHash,
					prefix: data.prefix,
					service_id: data.serviceId,
					credential_id: data.credentialId,
					expiresAt: data.expiresAt,
				})
				.returning();

			return newKey;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.createApiKey');
		}
	}

	// Lista todas as API Keys ativas de um serviço.
	async findAllByService(serviceId: string) {
		try {
			return await db
				.select({
					id: api_key.id,
					name: api_key.name,
					prefix: api_key.prefix,
					is_active: api_key.is_active,
					credential_id: api_key.credential_id,
					last_used_at: api_key.last_used_at,
					expiresAt: api_key.expiresAt,
					createdAt: api_key.createdAt,
				})
				.from(api_key)
				.where(and(eq(api_key.service_id, serviceId), isNull(api_key.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.findAllByService');
		}
	}

    // NOVO: Lista todas as API Keys de um usuário (em todos os seus serviços)
    async findAllByUser(userId: string) {
        try {
            return await db
                .select({
                    id: api_key.id,
                    name: api_key.name,
                    prefix: api_key.prefix,
                    is_active: api_key.is_active,
                    credential_id: api_key.credential_id,
                    service_id: api_key.service_id, // Útil para o dashboard global
                    last_used_at: api_key.last_used_at,
                    expiresAt: api_key.expiresAt,
                    createdAt: api_key.createdAt,
                })
                .from(api_key)
                .innerJoin(service, eq(api_key.service_id, service.id))
                .where(and(eq(service.owner_id, userId), isNull(api_key.deletedAt)));
        } catch (error) {
            throw parseDatabaseError(error, 'ApiKeyRepository.findAllByUser');
        }
    }

	// Busca uma API Key pelo hash.
	async findByHash(hash: string) {
		try {
			const [found] = await db
				.select()
				.from(api_key)
				.where(and(eq(api_key.key_hash, hash), isNull(api_key.deletedAt)))
				.limit(1);

			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.findByHash');
		}
	}

	// Busca uma API Key por ID.
	async findById(id: string) {
		try {
			const [found] = await db
				.select()
				.from(api_key)
				.where(and(eq(api_key.id, id), isNull(api_key.deletedAt)))
				.limit(1);

			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.findById');
		}
	}

	// Atualiza os dados de uma API Key.
	async updateById(id: string, data: any) {
		try {
			const [updated] = await db
				.update(api_key)
				.set({ ...data })
				.where(and(eq(api_key.id, id), isNull(api_key.deletedAt)))
				.returning();

			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ApiKeyRepository.updateById');
		}
	}

	// Soft delete de uma API Key.
	async softDeleteById(id: string) {
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
