import { db } from '../config/dbConfig.js';
import { logs } from '../config/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class LogRepository {
	// Lista todos os logs com paginação.
	// limit  Máximo de registros por página (padrão: 50)
	// offset Deslocamento para paginação (padrão: 0)
	async findAll(limit = 50, offset = 0) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [LogRepository] Listando logs (limit: ${limit}, offset: ${offset})...`,
			),
		);
		try {
			return await db.select().from(logs).orderBy(desc(logs.createdAt)).limit(limit).offset(offset);
		} catch (error) {
			throw parseDatabaseError(error, 'LogRepository.findAll');
		}
	}

	// Busca um log por ID.
	async findById(id: string) {
		console.log(chalk.magenta(`[${getTimestamp()}] [DB] [LogRepository] Buscando log: ${id}`));
		try {
			const [found] = await db.select().from(logs).where(eq(logs.id, id)).limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'LogRepository.findById');
		}
	}
}

export default new LogRepository();
