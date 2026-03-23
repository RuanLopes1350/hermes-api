import { db } from '../config/dbConfig.js';
import { and, eq, isNull } from 'drizzle-orm';
import { service } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class ServiceRepository {
	// Cria um novo serviço e o retorna.
	async createService(data: { name: string; creatorId: string; ownerId: string; settings?: any }) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ServiceRepository] Inserindo novo serviço...`),
		);
		try {
			const [newService] = await db
				.insert(service)
				.values({
					id: uuidv4(),
					name: data.name,
					creator_id: data.creatorId,
					owner_id: data.ownerId,
					settings: data.settings || {},
				})
				.returning();
			return newService;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.createService');
		}
	}

	// Lista todos os serviços ativos (não soft-deletados) de um determinado dono.
	async findAllByOwner(ownerId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Listando serviços do usuário: ${ownerId}`,
			),
		);
		try {
			return await db
				.select()
				.from(service)
				.where(and(eq(service.owner_id, ownerId), isNull(service.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findAllByOwner');
		}
	}

	// Busca um serviço ativo por ID e verifica que pertence ao owner informado.
	// Retorna null se não encontrado ou se foi soft-deletado.
	async findByIdAndOwner(serviceId: string, ownerId: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ServiceRepository] Buscando serviço: ${serviceId}`),
		);
		try {
			const [found] = await db
				.select()
				.from(service)
				.where(
					and(eq(service.id, serviceId), eq(service.owner_id, ownerId), isNull(service.deletedAt)),
				)
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findByIdAndOwner');
		}
	}

	// Atualiza nome e/ou settings de um serviço.
	async updateById(serviceId: string, data: { name?: string; settings?: any }) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Atualizando serviço: ${serviceId}`,
			),
		);
		try {
			const [updated] = await db
				.update(service)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(service.id, serviceId), isNull(service.deletedAt)))
				.returning();
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.updateById');
		}
	}

	// Soft delete: marca o serviço como deletado sem removê-lo do banco.
	// Preserva rastreabilidade de todas as entidades associadas.
	async softDeleteById(serviceId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Soft delete do serviço: ${serviceId}`,
			),
		);
		try {
			const [deleted] = await db
				.update(service)
				.set({ deletedAt: new Date() })
				.where(and(eq(service.id, serviceId), isNull(service.deletedAt)))
				.returning({ id: service.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.softDeleteById');
		}
	}
}

export default new ServiceRepository();
