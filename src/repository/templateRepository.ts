import { db } from '../config/dbConfig.js';
import { template } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class TemplateRepository {
	// Cria um novo template HTML para um serviço.
	async create(data: {
		name: string;
		serviceId: string;
		subjectTemplate?: string;
		htmlContent: string;
		textContent?: string;
	}) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [TemplateRepository] Inserindo template...`),
		);
		try {
			const [newTemplate] = await db
				.insert(template)
				.values({
					id: uuidv4(),
					name: data.name,
					service_id: data.serviceId,
					subject_template: data.subjectTemplate,
					html_content: data.htmlContent,
					text_content: data.textContent,
				})
				.returning();
			return newTemplate;
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.create');
		}
	}

	// Lista todos os templates ativos de um serviço.
	async findAllByService(serviceId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [TemplateRepository] Listando templates do serviço: ${serviceId}`,
			),
		);
		try {
			return await db
				.select()
				.from(template)
				.where(and(eq(template.service_id, serviceId), isNull(template.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.findAllByService');
		}
	}

	// Busca um template ativo por ID.
	async findById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [TemplateRepository] Buscando template: ${id}`),
		);
		try {
			const [found] = await db
				.select()
				.from(template)
				.where(and(eq(template.id, id), isNull(template.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.findById');
		}
	}

	// Atualiza campos de um template.
	async updateById(
		id: string,
		data: {
			name?: string;
			subject_template?: string | null;
			html_content?: string;
			text_content?: string | null;
		},
	) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [TemplateRepository] Atualizando template: ${id}`),
		);
		try {
			const [updated] = await db
				.update(template)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(template.id, id), isNull(template.deletedAt)))
				.returning();
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.updateById');
		}
	}

	// Soft delete de um template.
	async softDeleteById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [TemplateRepository] Soft delete do template: ${id}`),
		);
		try {
			const [deleted] = await db
				.update(template)
				.set({ deletedAt: new Date() })
				.where(and(eq(template.id, id), isNull(template.deletedAt)))
				.returning({ id: template.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.softDeleteById');
		}
	}
}

export default new TemplateRepository();
