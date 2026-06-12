import { db } from '../config/dbConfig.js';
import { desc, eq } from 'drizzle-orm';
import { service_log, user } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

export interface InsertLogData {
	service_id: string;
	actor_id: string | null;
	action: string;
	description: string;
	metadata?: Record<string, any>;
}

class ServiceLogRepository {
	async insertLog(data: InsertLogData) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceLogRepository] Inserindo log de auditoria...`,
			),
		);
		try {
			const [newLog] = await db
				.insert(service_log)
				.values({
					id: uuidv4(),
					service_id: data.service_id,
					actor_id: data.actor_id,
					action: data.action,
					description: data.description,
					metadata: data.metadata || null,
				})
				.returning();

			return newLog;
		} catch (error) {
			console.error(chalk.red(`[Erro ao inserir log]: ${error}`));
			// Nós não queremos que um erro no log quebre a ação principal, então apenas engolimos ou lançamos
			// Dependendo do nível de criticidade. Aqui vamos lançar pro service lidar.
			throw parseDatabaseError(error, 'ServiceLogRepository.insertLog');
		}
	}

	async findLogsByService(serviceId: string, limit: number = 50, offset: number = 0) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [ServiceLogRepository] Buscando logs do serviço: ${serviceId}`,
			),
		);
		try {
			const rows = await db
				.select({
					log: service_log,
					actorName: user.name,
					actorEmail: user.email,
				})
				.from(service_log)
				.leftJoin(user, eq(service_log.actor_id, user.id))
				.where(eq(service_log.service_id, serviceId))
				.orderBy(desc(service_log.createdAt))
				.limit(limit)
				.offset(offset);

			return rows.map((r) => ({
				...r.log,
				actorName: r.actorName,
				actorEmail: r.actorEmail,
			}));
		} catch (error) {
			throw parseDatabaseError(error, 'ServiceLogRepository.findLogsByService');
		}
	}
}

export default new ServiceLogRepository();
