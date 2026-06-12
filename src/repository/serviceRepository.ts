import { db } from '../config/dbConfig.js';
import { and, eq, isNull } from 'drizzle-orm';
import { service, service_member, user } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';
import { alias } from 'drizzle-orm/pg-core';

class ServiceRepository {
	async createService(data: { name: string; creatorId: string; settings?: any }) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [ServiceRepository] Inserindo novo serviço...`),
		);
		try {
			return await db.transaction(async (tx) => {
				const serviceId = uuidv4();
				const [newService] = await tx
					.insert(service)
					.values({
						id: serviceId,
						name: data.name,
						creator_id: data.creatorId,
						settings: data.settings || {},
					})
					.returning();

				await tx.insert(service_member).values({
					id: uuidv4(),
					service_id: serviceId,
					user_id: data.creatorId,
					role: 'owner',
				});

				return newService;
			});
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.createService');
		}
	}

	async findAllForAdmin() {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Listando todos os serviços (Admin)`,
			),
		);
		try {
			const rows = await db
				.select({
					service: service,
					ownerName: user.name,
					ownerEmail: user.email,
				})
				.from(service)
				.leftJoin(user, eq(service.creator_id, user.id))
				.where(isNull(service.deletedAt));

			return rows.map((r) => ({
				...r.service,
				_role: 'owner',
				ownerName: r.ownerName,
				ownerEmail: r.ownerEmail,
			}));
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findAllForAdmin');
		}
	}

	async findAllByUser(userId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Listando serviços do usuário: ${userId}`,
			),
		);
		try {
			const rows = await db
				.select({
					service: service,
					role: service_member.role,
					ownerName: user.name,
					ownerEmail: user.email,
				})
				.from(service)
				.innerJoin(service_member, eq(service.id, service_member.service_id))
				.leftJoin(user, eq(service.creator_id, user.id))
				.where(and(eq(service_member.user_id, userId), isNull(service.deletedAt)));

			return rows.map((r) => ({
				...r.service,
				_role: r.role,
				ownerName: r.ownerName,
				ownerEmail: r.ownerEmail,
			}));
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findAllByUser');
		}
	}

	async findServiceAndUserRole(
		serviceId: string,
		userId: string,
	): Promise<{ service: typeof service.$inferSelect; role: 'owner' | 'member' } | null> {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Buscando serviço e role: ${serviceId}`,
			),
		);
		try {
			const [result] = await db
				.select({
					service: service,
					role: service_member.role,
				})
				.from(service)
				.innerJoin(service_member, eq(service.id, service_member.service_id))
				.where(
					and(
						eq(service.id, serviceId),
						eq(service_member.user_id, userId),
						isNull(service.deletedAt),
					),
				)
				.limit(1);
			return result ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findServiceAndUserRole');
		}
	}

	async findById(serviceId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceRepository] Buscando serviço (worker): ${serviceId}`,
			),
		);
		try {
			const [found] = await db
				.select()
				.from(service)
				.where(and(eq(service.id, serviceId), isNull(service.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceRepository.findById');
		}
	}

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
