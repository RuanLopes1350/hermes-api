import { db } from '../config/dbConfig.js';
import { email, service, credential, service_member } from '../config/db/schema.js';
import { and, eq, isNull, desc, gte, lte, or, ilike, sql } from 'drizzle-orm';
import { redisPub } from '../config/redisConfig.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

export interface EmailListFilters {
	status?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
}

const EXPORT_MAX_ROWS = 5000;

class EmailRepository {
	// Monta as condições WHERE compartilhadas por listagem, contagem e exportação.
	private buildConditions(filters: EmailListFilters, serviceId?: string) {
		const conditions = [isNull(email.deletedAt)];

		if (serviceId) conditions.push(eq(email.service_id, serviceId));
		if (filters.status) conditions.push(eq(email.status, filters.status as any));

		if (filters.search) {
			const term = `%${filters.search}%`;
			conditions.push(or(ilike(email.recipient_to, term), ilike(email.subject, term))!);
		}

		if (filters.startDate) {
			conditions.push(gte(email.createdAt, new Date(filters.startDate)));
		}
		if (filters.endDate) {
			const end = new Date(filters.endDate);
			end.setHours(23, 59, 59, 999);
			conditions.push(lte(email.createdAt, end));
		}

		return conditions;
	}

	// Registra um novo e-mail na fila com status 'pending'.
	// O envio real será feito pelo worker BullMQ.
	async create(data: {
		serviceId: string;
		credentialId?: string;
		templateId?: string;
		subject: string;
		recipientTo: string;
		body?: string;
		variables?: Record<string, any>;
		scheduledAt?: Date;
		priority?: 'high' | 'medium' | 'low';
	}) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [EmailRepository] Inserindo e-mail na fila...`),
		);
		try {
			const [newEmail] = await db
				.insert(email)
				.values({
					id: uuidv4(),
					service_id: data.serviceId,
					credential_id: data.credentialId,
					service_template_id: data.templateId,
					subject: data.subject,
					recipient_to: data.recipientTo,
					body: data.body,
					variables: data.variables ?? {},
					scheduled_at: data.scheduledAt,
					priority: data.priority ?? 'medium',
				})
				.returning();
			return newEmail;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.create');
		}
	}

	// Registra uma lista de e-mails de uma vez (Bulk Insert)
	async createBulk(
		items: {
			serviceId: string;
			credentialId?: string;
			templateId?: string;
			subject: string;
			recipientTo: string;
			body?: string;
			variables?: Record<string, any>;
			scheduledAt?: Date;
			priority?: 'high' | 'medium' | 'low';
		}[],
	) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [EmailRepository] Inserindo ${items.length} e-mails em lote...`,
			),
		);
		try {
			const valuesToInsert = items.map((item) => ({
				id: uuidv4(),
				service_id: item.serviceId,
				credential_id: item.credentialId,
				service_template_id: item.templateId,
				subject: item.subject,
				recipient_to: item.recipientTo,
				body: item.body,
				variables: item.variables ?? {},
				scheduled_at: item.scheduledAt,
				priority: item.priority ?? 'medium',
			}));

			const newEmails = await db.insert(email).values(valuesToInsert).returning();
			return newEmails;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.createBulk');
		}
	}

	// Lista os e-mails de um serviço, com filtros e contagem total (pra paginação de verdade).
	async findAllByService(
		serviceId: string,
		filters: EmailListFilters = {},
		limit: number = 50,
		offset: number = 0,
	): Promise<{ rows: (typeof email.$inferSelect)[]; total: number }> {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [EmailRepository] Listando e-mails do serviço: ${serviceId}`,
			),
		);
		try {
			const conditions = this.buildConditions(filters, serviceId);

			const [rows, countResult] = await Promise.all([
				db
					.select()
					.from(email)
					.where(and(...conditions))
					.orderBy(desc(email.createdAt))
					.limit(limit)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(email)
					.where(and(...conditions)),
			]);

			return { rows, total: countResult[0]?.count || 0 };
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.findAllByService');
		}
	}

	async findAllByUser(
		userId: string,
		isAdmin: boolean,
		filters: EmailListFilters = {},
		limit: number = 50,
		offset: number = 0,
		serviceId?: string,
	): Promise<{ rows: any[]; total: number }> {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [${isAdmin ? 'ADMIN' : 'USER'}] [DB] [EmailRepository] Listando e-mails para o usuário: ${userId}`,
			),
		);
		try {
			const conditions = this.buildConditions(filters, serviceId);

			if (isAdmin) {
				const [rows, countResult] = await Promise.all([
					db
						.select({ email: email, serviceName: service.name, credentialName: credential.name })
						.from(email)
						.leftJoin(service, eq(email.service_id, service.id))
						.leftJoin(credential, eq(email.credential_id, credential.id))
						.where(and(...conditions))
						.orderBy(desc(email.createdAt))
						.limit(limit)
						.offset(offset),
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(email)
						.where(and(...conditions)),
				]);

				return {
					rows: rows.map((r) => ({
						...r.email,
						serviceName: r.serviceName,
						credentialName: r.credentialName ?? 'N/A',
					})),
					total: countResult[0]?.count || 0,
				};
			}

			const memberConditions = [eq(service_member.user_id, userId), ...conditions];
			const [rows, countResult] = await Promise.all([
				db
					.select({ email: email, serviceName: service.name, credentialName: credential.name })
					.from(email)
					.leftJoin(service, eq(email.service_id, service.id))
					.leftJoin(credential, eq(email.credential_id, credential.id))
					.innerJoin(service_member, eq(email.service_id, service_member.service_id))
					.where(and(...memberConditions))
					.orderBy(desc(email.createdAt))
					.limit(limit)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(email)
					.innerJoin(service_member, eq(email.service_id, service_member.service_id))
					.where(and(...memberConditions)),
			]);

			return {
				rows: rows.map((r) => ({
					...r.email,
					serviceName: r.serviceName,
					credentialName: r.credentialName ?? 'N/A',
				})),
				total: countResult[0]?.count || 0,
			};
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.findAllByUser');
		}
	}

	// Exporta (sem paginação, até EXPORT_MAX_ROWS) os e-mails que batem com os filtros — usado pelo CSV.
	async exportByUser(
		userId: string,
		isAdmin: boolean,
		filters: EmailListFilters = {},
		serviceId?: string,
	) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [${isAdmin ? 'ADMIN' : 'USER'}] [DB] [EmailRepository] Exportando e-mails para o usuário: ${userId}`,
			),
		);
		try {
			const conditions = this.buildConditions(filters, serviceId);

			if (isAdmin) {
				const rows = await db
					.select({ email: email, serviceName: service.name, credentialName: credential.name })
					.from(email)
					.leftJoin(service, eq(email.service_id, service.id))
					.leftJoin(credential, eq(email.credential_id, credential.id))
					.where(and(...conditions))
					.orderBy(desc(email.createdAt))
					.limit(EXPORT_MAX_ROWS);

				return rows.map((r) => ({
					...r.email,
					serviceName: r.serviceName,
					credentialName: r.credentialName ?? 'N/A',
				}));
			}

			const rows = await db
				.select({ email: email, serviceName: service.name, credentialName: credential.name })
				.from(email)
				.leftJoin(service, eq(email.service_id, service.id))
				.leftJoin(credential, eq(email.credential_id, credential.id))
				.innerJoin(service_member, eq(email.service_id, service_member.service_id))
				.where(and(eq(service_member.user_id, userId), ...conditions))
				.orderBy(desc(email.createdAt))
				.limit(EXPORT_MAX_ROWS);

			return rows.map((r) => ({
				...r.email,
				serviceName: r.serviceName,
				credentialName: r.credentialName ?? 'N/A',
			}));
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.exportByUser');
		}
	}

	// Busca um e-mail ativo por ID.
	async findById(id: string) {
		console.log(chalk.magenta(`[${getTimestamp()}] [DB] [EmailRepository] Buscando e-mail: ${id}`));
		try {
			const [found] = await db
				.select()
				.from(email)
				.where(and(eq(email.id, id), isNull(email.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.findById');
		}
	}

	// Soft delete de um e-mail.
	async softDeleteById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [EmailRepository] Soft delete do e-mail: ${id}`),
		);
		try {
			const [deleted] = await db
				.update(email)
				.set({ deletedAt: new Date() })
				.where(and(eq(email.id, id), isNull(email.deletedAt)))
				.returning({ id: email.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.softDeleteById');
		}
	}

	// Atualiza status, retry_count, error_log e sent_at.
	async updateStatus(
		id: string,
		data: {
			status?: 'pending' | 'sent' | 'failed' | 'retrying';
			retry_count?: number;
			error_log?: string | null;
			next_retry_at?: Date | null;
			sent_at?: Date | null;
		},
	) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [EmailRepository] Atualizando status do e-mail: ${id}`,
			),
		);
		try {
			const [updated] = await db
				.update(email)
				.set({
					...data,
				})
				.where(eq(email.id, id))
				.returning();

			if (updated) {
				redisPub.publish(
					`email-status:${updated.service_id}`,
					JSON.stringify({
						emailId: updated.id,
						status: updated.status,
						timestamp: new Date().toISOString(),
					}),
				).catch(() => {});
			}

			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.updateStatus');
		}
	}
}

export default new EmailRepository();
