import { db } from '../config/dbConfig.js';
import {
	email,
	user,
	service,
	template,
	service_member,
	session,
	credential,
} from '../config/db/schema.js';
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

class SSEManager {
	private clients = new Set<Response>();
	private timeout: NodeJS.Timeout | null = null;
	private listenersRegistered = false;

	addClient(res: Response) {
		this.clients.add(res);
		this.sendMetricsToClient(res);

		if (!this.listenersRegistered) {
			this.registerListeners();
		}
	}

	removeClient(res: Response) {
		this.clients.delete(res);
		if (this.clients.size === 0 && this.listenersRegistered) {
			this.unregisterListeners();
		}
	}

	private async sendMetricsToClient(res: Response) {
		try {
			const metrics = await this.fetchMetrics();
			if (this.clients.has(res)) {
				res.write(`data: ${JSON.stringify(metrics)}\n\n`);
			}
		} catch (err) {
			console.error('[SSE] Erro ao enviar métricas para o cliente:', err);
		}
	}

	private async fetchMetrics() {
		const [waiting, active, completed, failed, delayed] = await Promise.all([
			emailQueue.getWaitingCount(),
			emailQueue.getActiveCount(),
			emailQueue.getCompletedCount(),
			emailQueue.getFailedCount(),
			emailQueue.getDelayedCount(),
		]);
		return { waiting, active, completed, failed, delayed };
	}

	private async broadcastMetrics() {
		if (this.clients.size === 0) return;
		try {
			const metrics = await this.fetchMetrics();
			const payload = `data: ${JSON.stringify(metrics)}\n\n`;
			for (const client of this.clients) {
				try {
					client.write(payload);
				} catch (clientErr) {
					console.error('[SSE] Erro ao enviar broadcast para um cliente específico:', clientErr);
				}
			}
		} catch (err) {
			console.error('[SSE] Erro no broadcast das métricas:', err);
		}
	}

	private debouncedBroadcast = () => {
		if (this.timeout) return;
		this.timeout = setTimeout(async () => {
			await this.broadcastMetrics();
			this.timeout = null;
		}, 500);
	};

	private registerListeners() {
		globalQueueEvents.on('waiting', this.debouncedBroadcast);
		globalQueueEvents.on('active', this.debouncedBroadcast);
		globalQueueEvents.on('completed', this.debouncedBroadcast);
		globalQueueEvents.on('failed', this.debouncedBroadcast);
		globalQueueEvents.on('delayed', this.debouncedBroadcast);
		this.listenersRegistered = true;
		console.log(chalk.green(`[${getTimestamp()}] [SSE] Listeners globais registrados.`));
	}

	private unregisterListeners() {
		globalQueueEvents.off('waiting', this.debouncedBroadcast);
		globalQueueEvents.off('active', this.debouncedBroadcast);
		globalQueueEvents.off('completed', this.debouncedBroadcast);
		globalQueueEvents.off('failed', this.debouncedBroadcast);
		globalQueueEvents.off('delayed', this.debouncedBroadcast);
		this.listenersRegistered = false;
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
		console.log(chalk.yellow(`[${getTimestamp()}] [SSE] Listeners globais removidos.`));
	}
}

const sseManager = new SSEManager();

class DashboardService {
	/**
	 * Estatísticas Globais para o Administrador
	 */
	async getAdminStats(currentUser: any, days: number = 7) {
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

		// 3. Today vs Yesterday counts
		const todayDeltaData = await db.execute(sql`
			SELECT
				COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today,
				COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours') as yesterday
			FROM email
			WHERE deleted_at IS NULL
		`);

		// 4. Active sessions count
		const activeSessionsData = await db.execute(sql`
			SELECT COUNT(*) as count FROM session WHERE expires_at > NOW()
		`);

		// 5. Volume por dia (parametrizado)
		const volumeByDayData = await db.execute(sql`
			SELECT
				DATE(created_at) as date,
				COUNT(*) FILTER (WHERE status = 'sent') as sent,
				COUNT(*) FILTER (WHERE status = 'failed') as failed
			FROM email
			WHERE created_at >= NOW() - (${days} || ' days')::interval
			GROUP BY 1
			ORDER BY 1 ASC
		`);

		// 6. Distribuição de status
		const statusDistributionData = await db.execute(sql`
			SELECT status, COUNT(*) as total
			FROM email
			WHERE deleted_at IS NULL
			GROUP BY status
		`);

		// 7. Atividade recente (service_log)
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

		// 8. Envios recentes com retry_count, error_log, sent_at, latency_ms
		const recentEmailsData = await db.execute(sql`
			SELECT
				e.id,
				e.recipient_to as recipient,
				e.subject,
				e.status,
				e.priority,
				e.created_at,
				e.sent_at,
				e.retry_count,
				e.error_log,
				s.name as service_name,
				CASE
					WHEN e.sent_at IS NOT NULL
					THEN EXTRACT(EPOCH FROM (e.sent_at - e.created_at)) * 1000
					ELSE NULL
				END as latency_ms
			FROM email e
			LEFT JOIN service s ON e.service_id = s.id
			WHERE e.deleted_at IS NULL
			ORDER BY e.created_at DESC
			LIMIT 10
		`);

		// 9. Top Serviços por Volume
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

		// 10. Multi-series volume by service
		const volumeByServiceData = await db.execute(sql`
			SELECT
				s.name as service_name,
				DATE(e.created_at) as date,
				COUNT(*) as total
			FROM email e
			JOIN service s ON e.service_id = s.id
			WHERE e.created_at >= NOW() - (${days} || ' days')::interval
				AND s.deleted_at IS NULL
				AND e.deleted_at IS NULL
			GROUP BY s.name, DATE(e.created_at)
			ORDER BY 2 ASC, 3 DESC
		`);

		// 11. Top services by failure rate
		const topServicesByFailureRateData = await db.execute(sql`
			SELECT
				s.name,
				COUNT(*) as total,
				COUNT(*) FILTER (WHERE e.status = 'failed') as failed,
				ROUND(
					COUNT(*) FILTER (WHERE e.status = 'failed')::numeric / NULLIF(COUNT(*), 0) * 100, 1
				) as failure_rate
			FROM email e
			JOIN service s ON e.service_id = s.id
			WHERE s.deleted_at IS NULL AND e.deleted_at IS NULL
			GROUP BY s.id, s.name
			ORDER BY failure_rate DESC
			LIMIT 5
		`);

		return {
			summary: {
				totalSent: Number(totalEmailsRes[0].value),
				totalFailed: Number(failedEmailsRes[0].value),
				totalUsers: Number(totalUsersRes[0].value),
				totalServices: Number(totalServicesRes[0].value),
				activeSessions: Number((activeSessionsData.rows[0] as any)?.count || 0),
				today: Number((todayDeltaData.rows[0] as any)?.today || 0),
				yesterday: Number((todayDeltaData.rows[0] as any)?.yesterday || 0),
			},
			queue: {
				waiting,
				active,
				failed: queueFailed,
			},
			volumeByDay: volumeByDayData.rows,
			volumeByService: volumeByServiceData.rows.map((row: any) => ({
				serviceName: row.service_name,
				date: row.date,
				total: Number(row.total),
			})),
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
				sentAt: row.sent_at,
				retryCount: Number(row.retry_count || 0),
				errorLog: row.error_log || null,
				latencyMs: row.latency_ms ? Number(row.latency_ms) : null,
				serviceName: row.service_name,
			})),
			topServicesByVolume: topServicesByVolumeData.rows.map((row: any) => ({
				name: row.name,
				emailCount: Number(row.email_count),
			})),
			topServicesByFailureRate: topServicesByFailureRateData.rows.map((row: any) => ({
				name: row.name,
				total: Number(row.total),
				failed: Number(row.failed),
				failureRate: Number(row.failure_rate),
			})),
		};
	}

	/**
	 * Estatísticas Pessoais para o Usuário
	 */
	async getUserStats(currentUser: any, days: number = 7) {
		const userId = currentUser.id;

		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [DashboardService] Gerando stats de USER: ${userId}`,
			),
		);

		// 1. Resumo Pessoal
		const [sentRes, servicesRes, templatesRes] = await Promise.all([
			db
				.select({ value: count() })
				.from(email)
				.innerJoin(service_member, eq(email.service_id, service_member.service_id))
				.where(and(eq(service_member.user_id, userId), eq(email.status, 'sent'))),
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

		// 1b. Separate status counts (failed, retrying, pending)
		const statusCountsData = await db.execute(sql`
			SELECT
				COUNT(*) FILTER (WHERE e.status = 'failed') as failed_count,
				COUNT(*) FILTER (WHERE e.status = 'retrying') as retrying_count,
				COUNT(*) FILTER (WHERE e.status = 'pending') as pending_count
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.deleted_at IS NULL
		`);

		// 1c. Today vs yesterday
		const todayDeltaData = await db.execute(sql`
			SELECT
				COUNT(*) FILTER (WHERE e.created_at >= NOW() - INTERVAL '24 hours') as today,
				COUNT(*) FILTER (WHERE e.created_at >= NOW() - INTERVAL '48 hours' AND e.created_at < NOW() - INTERVAL '24 hours') as yesterday
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.deleted_at IS NULL
		`);

		// 1d. Next scheduled email
		const nextScheduledData = await db.execute(sql`
			SELECT MIN(e.scheduled_at) as next_scheduled
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId}
				AND e.scheduled_at > NOW()
				AND e.status = 'pending'
				AND e.deleted_at IS NULL
		`);

		// 1e. Inactive credentials alert
		const inactiveCredentialsData = await db.execute(sql`
			SELECT s.name as service_name, c.name as cred_name, c.id as cred_id
			FROM credential c
			JOIN service s ON c.service_id = s.id
			JOIN service_member sm ON s.id = sm.service_id
			WHERE sm.user_id = ${userId}
				AND c.is_active = false
				AND c.deleted_at IS NULL
				AND s.deleted_at IS NULL
		`);

		// 2. Volume por dia (parametrizado)
		const volumeByDayData = await db.execute(sql`
			SELECT
				DATE(e.created_at) as date,
				COUNT(*) FILTER (WHERE e.status = 'sent') as sent,
				COUNT(*) FILTER (WHERE e.status = 'failed') as failed
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.created_at >= NOW() - (${days} || ' days')::interval
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

		// 5. Envios recentes com retry_count, error_log, sent_at, latency_ms
		const recentEmailsData = await db.execute(sql`
			SELECT
				e.id,
				e.recipient_to as recipient,
				e.subject,
				e.status,
				e.priority,
				e.created_at,
				e.sent_at,
				e.retry_count,
				e.error_log,
				s.name as service_name,
				CASE
					WHEN e.sent_at IS NOT NULL
					THEN EXTRACT(EPOCH FROM (e.sent_at - e.created_at)) * 1000
					ELSE NULL
				END as latency_ms
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
				failed: Number((statusCountsData.rows[0] as any)?.failed_count || 0),
				retrying: Number((statusCountsData.rows[0] as any)?.retrying_count || 0),
				pending: Number((statusCountsData.rows[0] as any)?.pending_count || 0),
				services: Number(servicesRes[0].value),
				templates: Number(templatesRes[0].value),
				today: Number((todayDeltaData.rows[0] as any)?.today || 0),
				yesterday: Number((todayDeltaData.rows[0] as any)?.yesterday || 0),
			},
			nextScheduled: (nextScheduledData.rows[0] as any)?.next_scheduled || null,
			inactiveCredentials: inactiveCredentialsData.rows.map((row: any) => ({
				serviceName: row.service_name,
				credName: row.cred_name,
				credId: row.cred_id,
			})),
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
				sentAt: row.sent_at,
				retryCount: Number(row.retry_count || 0),
				errorLog: row.error_log || null,
				latencyMs: row.latency_ms ? Number(row.latency_ms) : null,
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

		sseManager.addClient(res);

		const keepAlive = setInterval(() => {
			try {
				res.write(': ping\n\n');
			} catch (err) {
				// Ignora se o socket já fechou antes do interval limpar
			}
		}, 30000);

		req.on('close', () => {
			console.log(chalk.yellow(`[${getTimestamp()}] [SSE Desconectado]`));
			clearInterval(keepAlive);
			sseManager.removeClient(res);
			res.end();
		});
	}
}

export default new DashboardService();
