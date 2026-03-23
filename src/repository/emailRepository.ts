import { db } from '../config/dbConfig.js';
import { email } from '../config/db/schema.js';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class EmailRepository {
	// Registra um novo e-mail na fila com status 'pending'.
	// O envio real será feito pelo worker BullMQ (implementação futura).
	async create(data: {
		serviceId: string;
		credentialId?: string;
		templateId?: string;
		subject: string;
		recipientTo: string;
		body?: string;
		variables?: Record<string, any>;
		scheduledAt?: Date;
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
					// status padrão é 'pending' (definido no schema)
				})
				.returning();
			return newEmail;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.create');
		}
	}

	// Lista os e-mails de um serviço, com filtro opcional de status.
	// Ordenados por data de criação decrescente (mais recentes primeiro).
	// Exclui soft-deletados.
	async findAllByService(serviceId: string, status?: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [EmailRepository] Listando e-mails do serviço: ${serviceId}`,
			),
		);
		try {
			const conditions = [eq(email.service_id, serviceId), isNull(email.deletedAt)];

			// Filtro de status opcional (pending, sent, failed, retrying)
			if (status) {
				conditions.push(eq(email.status, status as any));
			}

			return await db
				.select()
				.from(email)
				.where(and(...conditions))
				.orderBy(desc(email.createdAt));
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.findAllByService');
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

	// Soft delete de um e-mail — só deve ser chamado se status for 'pending'.
	// A verificação de status é feita no Service antes de chamar aqui.
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
	// Uso exclusivo interno do worker BullMQ (implementação futura).
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
			const [updated] = await db.update(email).set(data).where(eq(email.id, id)).returning();
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'EmailRepository.updateStatus');
		}
	}
}

export default new EmailRepository();
