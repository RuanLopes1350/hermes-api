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

		// 3. Latência Global: Média de (sent_at - created_at) por dia nos últimos 7 dias
		const latencyData = await db.execute(sql`
			SELECT 
				DATE(created_at) as date,
				AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_latency
			FROM email
			WHERE status = 'sent' AND sent_at IS NOT NULL
			  AND created_at >= NOW() - INTERVAL '7 days'
			GROUP BY 1
			ORDER BY 1 ASC
		`);

		// 4. Lista de Todos os Serviços com Nome do Dono
		const allServices = await db
			.select({
				id: service.id,
				name: service.name,
				ownerName: user.name,
				createdAt: service.createdAt,
			})
			.from(service)
			.innerJoin(
				service_member,
				and(eq(service.id, service_member.service_id), eq(service_member.role, 'owner')),
			)
			.innerJoin(user, eq(service_member.user_id, user.id))
			.where(isNull(service.deletedAt))
			.orderBy(desc(service.createdAt))
			.limit(10);

		return {
			summary: {
				totalSent: totalEmailsRes[0].value,
				totalFailed: failedEmailsRes[0].value,
				totalUsers: totalUsersRes[0].value,
				totalServices: totalServicesRes[0].value,
			},
			queue: {
				waiting,
				active,
				failed: queueFailed,
			},
			latency: latencyData.rows,
			allServices,
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

		// 2. Latência Pessoal: Média por dia nos últimos 7 dias para os serviços do usuário
		const latencyData = await db.execute(sql`
			SELECT 
				DATE(e.created_at) as date,
				AVG(EXTRACT(EPOCH FROM (e.sent_at - e.created_at))) as avg_latency
			FROM email e
			INNER JOIN service_member sm ON e.service_id = sm.service_id
			WHERE sm.user_id = ${userId} AND e.status = 'sent' AND e.sent_at IS NOT NULL
			  AND e.created_at >= NOW() - INTERVAL '7 days'
			GROUP BY 1
			ORDER BY 1 ASC
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

		// 4. Últimos Envios
		const recentEmails = await db
			.select({
				id: email.id,
				recipient: email.recipient_to,
				subject: email.subject,
				status: email.status,
				createdAt: email.createdAt,
			})
			.from(email)
			.innerJoin(service_member, eq(email.service_id, service_member.service_id))
			.where(eq(service_member.user_id, userId))
			.orderBy(desc(email.createdAt))
			.limit(5);

		return {
			summary: {
				sent: sentRes[0].value,
				pending: pendingRes[0].value,
				services: servicesRes[0].value,
				templates: templatesRes[0].value,
			},
			latency: latencyData.rows,
			topTemplates: topTemplates.rows,
			recentEmails,
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
