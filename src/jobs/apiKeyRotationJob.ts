import chalk from 'chalk';
import { db } from '../config/dbConfig.js';
import { api_key, service, user } from '../config/db/schema.js';
import { and, lte, isNull, isNotNull, eq } from 'drizzle-orm';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { isIP } from 'node:net';

function isSafeUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

		const hostname = parsed.hostname;

		// Se o hostname for um IP, verifica se é privado/local
		if (isIP(hostname)) {
			// Lógica para bloquear 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
			// Bibliotecas como 'is-ip-private' facilitam este trabalho.
			return false;
		}

		// Bloqueia nomes conhecidos de loopback
		if (hostname === 'localhost') return false;

		return true;
	} catch {
		return false;
	}
}


 // Lógica de varredura e notificação de API Keys expirando.
 // Esta função agora será chamada pelo BullMQ em vez do node-cron.
export async function processApiKeyRotation() {
	console.log(
		chalk.blue.bold(`[${getTimestamp()}] [JOB] Iniciando varredura de API Keys expirando...`),
	);
	try {
		const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		// Busca keys ativas, com expiresAt setado, expirando em <= 7 dias, que ainda não foram notificadas
		const keysToNotify = await db
			.select({
				keyId: api_key.id,
				keyName: api_key.name,
				expiresAt: api_key.expiresAt,
				serviceId: service.id,
				serviceName: service.name,
				settings: service.settings,
				ownerEmail: user.email,
			})
			.from(api_key)
			.innerJoin(service, eq(api_key.service_id, service.id))
			.innerJoin(user, eq(service.owner_id, user.id))
			.where(
				and(
					eq(api_key.is_active, true),
					isNull(api_key.deletedAt),
					isNotNull(api_key.expiresAt),
					lte(api_key.expiresAt, sevenDaysFromNow),
					isNull(api_key.notification_sent_at),
				),
			);

		if (keysToNotify.length === 0) {
			console.log(
				chalk.gray(
					`[${getTimestamp()}] [JOB] Nenhuma API Key no período de notificação ('grace period').`,
				),
			);
			return;
		}

		console.log(
			chalk.yellow(
				`[${getTimestamp()}] [JOB] Foram encontradas ${keysToNotify.length} API Keys necessitando de rotação/aviso.`,
			),
		);

		for (const data of keysToNotify) {
			const settings = data.settings as any;
			const webhookUrl = settings?.notifications?.webhook_url;
			const alertEmail = settings?.notifications?.alert_email || data.ownerEmail;

			// 1. Notificação via Webhook (POST Request)
			if (webhookUrl && isSafeUrl(webhookUrl)) {
				try {
					await fetch(webhookUrl, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							event: 'api_key.expiring',
							service_name: data.serviceName,
							key_name: data.keyName,
							expires_at: data.expiresAt,
							message: `Sua API Key '${data.keyName}' expirará em breve. Por favor, gere uma nova chave ativa.`,
						}),
					});
					console.log(
						chalk.green(
							`[${getTimestamp()}] [JOB] Webhook disparado para ${webhookUrl} (Key: ${data.keyId})`,
						),
					);
				} catch (err: any) {
					console.error(
						chalk.red(
							`[${getTimestamp()}] [JOB] Erro ao disparar webhook para ${webhookUrl}: ${err.message}`,
						),
					);
				}
			}

			// 2. Notificação via Email (Processamento isolado/mockado provisoriamente)
			if (alertEmail) {
				console.log(
					chalk.cyan(
						`[${getTimestamp()}] [JOB] [MOCK EMAIL] Simulando o envio de e-mail de alerta para ${alertEmail} informando a expiração da key ${data.keyName}`,
					),
				);
			}

			// 3. Atualizar banco marcando notificação como enviada
			await db
				.update(api_key)
				.set({ notification_sent_at: new Date() })
				.where(eq(api_key.id, data.keyId));
		}

		console.log(chalk.blue.bold(`[${getTimestamp()}] [JOB] Varredura finalizada.`));
	} catch (error) {
		console.error(chalk.red.bold(`[${getTimestamp()}] [JOB] Erro crítico na varredura:`), error);
		throw error; // Lançar erro para o BullMQ saber que o job falhou
	}
}
