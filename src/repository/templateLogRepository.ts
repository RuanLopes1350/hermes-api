import { db } from '../config/dbConfig.js';
import { desc, eq } from 'drizzle-orm';
import { template_log, user } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

export interface InsertTemplateLogData {
	template_id: string;
	actor_id: string | null;
	action: string;
	description: string;
	metadata?: Record<string, any>;
}

class TemplateLogRepository {
	async insertLog(data: InsertTemplateLogData) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [TemplateLogRepository] Inserindo log de auditoria do template...`,
			),
		);
		try {
			const [newLog] = await db
				.insert(template_log)
				.values({
					id: uuidv4(),
					template_id: data.template_id,
					actor_id: data.actor_id,
					action: data.action,
					description: data.description,
					metadata: data.metadata || null,
				})
				.returning();

			return newLog;
		} catch (error) {
			console.error(chalk.red(`[Erro ao inserir log de template]: ${error}`));
			throw parseDatabaseError(error, 'TemplateLogRepository.insertLog');
		}
	}

	async findLogsByTemplate(templateId: string, limit: number = 50, offset: number = 0) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [TemplateLogRepository] Buscando logs do template: ${templateId}`,
			),
		);
		try {
			const rows = await db
				.select({
					log: template_log,
					actorName: user.name,
					actorEmail: user.email,
				})
				.from(template_log)
				.leftJoin(user, eq(template_log.actor_id, user.id))
				.where(eq(template_log.template_id, templateId))
				.orderBy(desc(template_log.createdAt))
				.limit(limit)
				.offset(offset);

			return rows.map((r) => ({
				...r.log,
				actorName: r.actorName,
				actorEmail: r.actorEmail,
			}));
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateLogRepository.findLogsByTemplate');
		}
	}
}

export default new TemplateLogRepository();
