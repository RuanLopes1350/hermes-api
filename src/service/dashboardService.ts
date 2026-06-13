import { db } from '../config/dbConfig.js';
import { email, user, service, template, service_member } from '../config/db/schema.js';
import { eq, count, and, isNull, sql, desc } from 'drizzle-orm';
import { emailQueue } from '../queue/emailQueue.js';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { Request, Response } from 'express';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { globalQueueEvents } from '../queue/queueEvents.js';

export class DashboardDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'DashboardDomainError';
	}
}

class DashboardService {
	/**
	 * Estatísticas Globais para o Administrador
	 */
	async getAdminStats(currentUser: any) {
		const isAdmin = currentUser?.isAdmin ?? false;
		if (!isAdmin) {
			throw new DashboardDomainError(
				'Acesso negado. Esta rota é restrita a administradores.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [DashboardService] Gerando stats de ADMIN`),
		);

		// 1. Resumo de Volumes (Paralelo)
		const [totalEmailsRes, failedEmailsRes, totalUsersRes, totalServicesRes] = await Promise.all([
			db.select({ value: count() }).from(email).where(eq(email.status, 'sent')),
			db.select({ value: count() }).from(email).where(eq(email.status, 'failed')),
			db.select({ value: count() }).from(user),
			db.select({ value: count() }).from(service).where(isNull(service.deletedAt)),
		]);

		// 2. Status da Fila (Redis/BullMQ)
		const [waiting, active, queueFailed] = await Promise.all([
			emailQueue.getWaitingCount(),
			emailQueue.getActiveCount(),
			emailQueue.getFailedCount(),
		]);

		// 3. Volume por dia (Últimos 7 dias)
		const volumeByDayData = await db.execute(sql`
			SELECT 
				DATE(created_at) as date,
				COUNT(*) FILTER (WHERE status = 'sent') as sent,
				COUNT(*) FILTER (WHERE status = 'failed') as failed
			FROM email
			WHERE created_at >= NOW() - INTERVAL '7 days'
			GROUP BY 1
			ORDER BY 1 ASC
		`);

		// 4. Distribuição de status
		const statusDistributionData = await db.execute(sql`
			SELECT status, COUNT(*) as total
			FROM email
			WHERE deleted_at IS NULL
			GROUP BY status
		`);

		// 5. Atividade recente (service_log)
		const recentActivityData = await db.execute(sql`
			SELECT 
				sl.action,
				sl.description,
				sl.created_at,
				u.name as actor_name,
				s.name as service_name
			FROM service_log sl
			LEFT JOIN "user" u ON sl.actor_id = u.id
			LEFT JOIN service s ON sl.service_id = s.id
			ORDER BY sl.created_at DESC
			LIMIT 10
		`);

		// 6. Envios recentes melhorado
		const recentEmailsData = await db.execute(sql`
			SELECT 
				e.id,
				e.recipient_to as recipient,
				e.subject,
				e.status,
				e.priority,
				e.created_at,
				s.name as service_name
			FROM email e
			LEFT JOIN service s ON e.service_id = s.id
			WHERE e.deleted_at IS NULL
			ORDER BY e.created_at DESC
			LIMIT 10
		`);

		// 7. Top Serviços por Volume
		const topServicesByVolumeData = await db.execute(sql`
			SELECT 
				s.name,
				COUNT(e.id) as email_count
			FROM email e
			INNER JOIN service s ON e.service_id = s.id
			WHERE s.deleted_at IS NULL
			GROUP BY s.id, s.name
			ORDER BY email_count DESC
			LIMIT 5
		`);

		return {
			summary: {
				totalSent: Number(totalEmailsRes[0].value),
				totalFailed: Number(failedEmailsRes[0].value),
				totalUsers: Number(totalUsersRes[0].value),
				totalServices: Number(totalServicesRes[0].value),
			},
			queue: {
				waiting,
				active,
				failed: queueFailed,
			},
			volumeByDay: volumeByDayData.rows,
			statusDistribution: statusDistributionData.rows,
			recentActivity: recentActivityData.rows.map((row: any) => ({
				action: row.action,
				description: row.description,
				createdAt: row.created_at,
				actorName: row.actor_name,
				serviceName: row.service_name,
			})),
			recentEmails: recentEmailsData.rows.map((row: any) => ({
				id: row.id,
				recipient: row.recipient,
				subject: row.subject,
				status: row.status,
				priority: row.priority,
				createdAt: row.created_at,
				serviceName: row.service_name,
			})),
			topServicesByVolume: topServicesByVolumeData.rows.map((row: any) => ({
				name: row.name,
				emailCount: Number(row.email_count),
			})),
		};
	}

	/**
	 * Estatísticas Pessoais para o Usuário
	 */
	async getUserStats(currentUser: any) {
		const userId = currentUser.id;

		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [DashboardService] Gerando stats de USER: ${userId}`,
			),
		);

		// 1. Resumo Pessoal
		const [sentRes, pendingRes, servicesRes, templatesRes] = await Promise.all([
			db
				.select({ value: count() })
				.from(email)
				.innerJoin(service_member, eq(email.service_id, service_member.service_id))
				.where(and(eq(service_member.user_id, userId), eq(email.status, 'sent'))),
			db
				.select({ value: count() })
				.from(email)
				.innerJoin(service_member, eq(email.service_id, service_member.service_id))
				.where(
					and(eq(service_member.user_id, userId), sql`${email.status} IN ('pending', 'retrying')`),
				),
			db
				.select({ value: count() })
				.from(service_member)
				.innerJoin(service, eq(service_member.service_id, service.id))
				.where(and(eq(service_member.user_id, userId), isNull(service.deletedAt))),
			db
				.select({ value: count() })
				.from(template)
				.innerJoin(service_member, eq(template.service_id, service_member.service_id))
				.where(and(eq(service_member.user_id, userId), isNull(template.deletedAt))),
		]);

		// 2. Volume por dia (Últimos 7 dias)
		const volumeByDayData = await db.execute(sql`
			SELECT 
				DATE(e.created_at) as date,
				COUNT(*) FILTER (WHERE e.status = 'sent') as sent,
				COUNT(*) FILTER (WHERE e.status = 'failed') as failed
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.created_at >= NOW() - INTERVAL '7 days'
			GROUP BY 1
			ORDER BY 1 ASC
		`);

		// 3. Distribuição de status
		const statusDistributionData = await db.execute(sql`
			SELECT e.status, COUNT(*) as total
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.deleted_at IS NULL
			GROUP BY e.status
		`);

		// 4. Atividade recente (service_log)
		const recentActivityData = await db.execute(sql`
			SELECT 
				sl.action,
				sl.description,
				sl.created_at,
				u.name as actor_name,
				s.name as service_name
			FROM service_log sl
			INNER JOIN service_member sm ON sl.service_id = sm.service_id
			LEFT JOIN "user" u ON sl.actor_id = u.id
			LEFT JOIN service s ON sl.service_id = s.id
			WHERE sm.user_id = ${userId}
			ORDER BY sl.created_at DESC
			LIMIT 10
		`);

		// 5. Envios recentes melhorado
		const recentEmailsData = await db.execute(sql`
			SELECT 
				e.id,
				e.recipient_to as recipient,
				e.subject,
				e.status,
				e.priority,
				e.created_at,
				s.name as service_name
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			LEFT JOIN service s ON e.service_id = s.id
			WHERE sm.user_id = ${userId} AND e.deleted_at IS NULL
			ORDER BY e.created_at DESC
			LIMIT 10
		`);

		// 3. Top Templates
		const topTemplates = await db.execute(sql`
			SELECT 
				t.name,
				COUNT(e.id) as usage_count
			FROM email e
			INNER JOIN template t ON e.service_template_id = t.id
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId}
			GROUP BY t.id, t.name
			ORDER BY 2 DESC
			LIMIT 5
		`);

		return {
			summary: {
				sent: Number(sentRes[0].value),
				pending: Number(pendingRes[0].value),
				services: Number(servicesRes[0].value),
				templates: Number(templatesRes[0].value),
			},
			volumeByDay: volumeByDayData.rows,
			statusDistribution: statusDistributionData.rows,
			recentActivity: recentActivityData.rows.map((row: any) => ({
				action: row.action,
				description: row.description,
				createdAt: row.created_at,
				actorName: row.actor_name,
				serviceName: row.service_name,
			})),
			recentEmails: recentEmailsData.rows.map((row: any) => ({
				id: row.id,
				recipient: row.recipient,
				subject: row.subject,
				status: row.status,
				priority: row.priority,
				createdAt: row.created_at,
				serviceName: row.service_name,
			})),
			topTemplates: topTemplates.rows.map((row: any) => ({
				name: row.name,
				usage_count: Number(row.usage_count),
			})),
		};
	}

	/**
	 * Endpoint de SSE para eventos da fila de emails
	 */
	streamQueueEvents(req: Request, res: Response) {
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		const sendMetrics = async () => {
			try {
				const [waiting, active, completed, failed, delayed] = await Promise.all([
					emailQueue.getWaitingCount(),
					emailQueue.getActiveCount(),
					emailQueue.getCompletedCount(),
					emailQueue.getFailedCount(),
					emailQueue.getDelayedCount(),
				]);

				const payload = { waiting, active, completed, failed, delayed };
				res.write(`data: ${JSON.stringify(payload)}\n\n`);
			} catch (err) {
				console.error('[SSE] Erro ao buscar métricas', err);
			}
		};

		sendMetrics();

		let timeout: NodeJS.Timeout | null = null;
		const debouncedSendMetrics = () => {
			if (timeout) return;
			timeout = setTimeout(() => {
				sendMetrics();
				timeout = null;
			}, 500); // Throttling de 500ms para evitar sobrecarga no Redis
		};

		globalQueueEvents.on('waiting', debouncedSendMetrics);
		globalQueueEvents.on('active', debouncedSendMetrics);
		globalQueueEvents.on('completed', debouncedSendMetrics);
		globalQueueEvents.on('failed', debouncedSendMetrics);
		globalQueueEvents.on('delayed', debouncedSendMetrics);

		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
		}, 30000);

		req.on('close', () => {
			console.log(chalk.yellow(`[${getTimestamp()}] [SSE Desconectado]`));
			clearInterval(keepAlive);
			if (timeout) clearTimeout(timeout);
			globalQueueEvents.off('waiting', debouncedSendMetrics);
			globalQueueEvents.off('active', debouncedSendMetrics);
			globalQueueEvents.off('completed', debouncedSendMetrics);
			globalQueueEvents.off('failed', debouncedSendMetrics);
			globalQueueEvents.off('delayed', debouncedSendMetrics);
			res.end();
		});
	}
}

export default new DashboardService();
