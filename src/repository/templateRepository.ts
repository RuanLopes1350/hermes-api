import { db } from '../config/dbConfig.js';
import { template, service } from '../config/db/schema.js';
import { and, eq, isNull, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class TemplateRepository {
	// Cria um novo template HTML para um serviço.
	async create(data: {
		name: string;
		serviceId?: string | null;
		creatorId: string;
		subjectTemplate?: string;
		htmlContent: string;
		textContent?: string;
		global: boolean;
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
					creator_id: data.creatorId,
					global: data.global,
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

	// Lista todos os templates acessíveis por um usuário.
	async findAllByUser(userId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [TemplateRepository] Listando todos os templates do usuário: ${userId}`,
			),
		);
		try {
			return await db
				.select({
					id: template.id,
					name: template.name,
					service_id: template.service_id,
					creator_id: template.creator_id,
					global: template.global,
					subject_template: template.subject_template,
					html_content: template.html_content,
					text_content: template.text_content,
					createdAt: template.createdAt,
					updatedAt: template.updatedAt,
				})
				.from(template)
				.leftJoin(service, eq(template.service_id, service.id))
				.where(
					and(
						or(
							eq(service.owner_id, userId),
							eq(template.creator_id, userId),
							eq(template.global, true)
						),
						isNull(template.deletedAt)
					)
				);
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.findAllByUser');
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

	// Busca um template por ID verificando o acesso do usuário.
	async findByIdAndUser(id: string, userId: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [TemplateRepository] Buscando template ${id} para usuário ${userId}`),
		);
		try {
			const [found] = await db
				.select({
					id: template.id,
					name: template.name,
					service_id: template.service_id,
					creator_id: template.creator_id,
					global: template.global,
					subject_template: template.subject_template,
					html_content: template.html_content,
					text_content: template.text_content,
				})
				.from(template)
				.leftJoin(service, eq(template.service_id, service.id))
				.where(
					and(
						eq(template.id, id),
						or(
							eq(service.owner_id, userId),
							eq(template.creator_id, userId),
							eq(template.global, true)
						),
						isNull(template.deletedAt)
					)
				)
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'TemplateRepository.findByIdAndUser');
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
			global?: boolean;
			service_id?: string | null;
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
