import chalk from 'chalk';
import { db } from '../config/dbConfig.js';
import { api_key, service, user } from '../config/db/schema.js';
import { and, lte, lt, isNull, isNotNull, eq, or } from 'drizzle-orm';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { isIP } from 'node:net';
import { createHmac } from 'node:crypto';
import { generateSecureApiKey } from '../utils/apiKeyGenerate.js';
import apiKeyRepository from '../repository/apiKeyRepository.js';

function isSafeUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
		const hostname = parsed.hostname;
		if (isIP(hostname)) return false;
		if (hostname === 'localhost') return false;
		return true;
	} catch {
		return false;
	}
}

export async function processApiKeyRotation() {
	console.log(chalk.blue.bold(`[${getTimestamp()}] [JOB] Iniciando varredura de API Keys...`));
	try {
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// --- ETAPA 1: DESATIVAÇÃO DE CHAVES EXPIRADAS (HARD CLEANUP) ---
		const expiredKeys = await db
			.update(api_key)
			.set({ is_active: false })
			.where(
				and(
					eq(api_key.is_active, true),
					isNotNull(api_key.expiresAt),
					lt(api_key.expiresAt, now),
					isNull(api_key.deletedAt),
				),
			)
			.returning({ id: api_key.id, name: api_key.name });

		if (expiredKeys.length > 0) {
			console.log(chalk.yellow.bold(`[${getTimestamp()}] [JOB] Foram desativadas ${expiredKeys.length} chaves expiradas.`));
		}

		// --- ETAPA 2: NOTIFICAÇÃO E ROTAÇÃO AUTOMÁTICA ---
		const maxNoticeDays = 30;
		const maxNoticeThreshold = new Date(now.getTime() + maxNoticeDays * 24 * 60 * 60 * 1000);

		const potentialKeysToNotify = await db
			.select({
				keyId: api_key.id,
				keyName: api_key.name,
				expiresAt: api_key.expiresAt,
				notificationSentAt: api_key.notification_sent_at,
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
					lte(api_key.expiresAt, maxNoticeThreshold),
					or(
						isNull(api_key.notification_sent_at),
						lt(api_key.notification_sent_at, todayStart)
					)
				),
			);

		if (potentialKeysToNotify.length > 0) {
			for (const data of potentialKeysToNotify) {
				const settings = data.settings as any || {};
				const noticeDays = settings?.notifications?.notice_days || 7;
				const autoRotate = settings?.security?.auto_rotate || false;
				const rotateThreshold = settings?.security?.rotate_threshold_days || 3;
				
				const expiresAt = new Date(data.expiresAt!);
				const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24));

				if (diffDays > noticeDays) continue;

				const webhookUrl = settings?.notifications?.webhook_url;
				const webhookSecret = settings?.notifications?.webhook_secret;
				
				// ROTAÇÃO AUTOMÁTICA
				let rotationData = null;
				if (autoRotate && diffDays <= rotateThreshold) {
					const rotatedKeys = settings?.security?.rotated_keys || [];
					if (!rotatedKeys.includes(data.keyId)) {
						console.log(chalk.magenta(`[${getTimestamp()}] [JOB] Executando rotação automática para key: ${data.keyId}`));
						
						const { fullApiKey, keyHash, prefix } = await generateSecureApiKey();
						const newKey = await apiKeyRepository.createApiKey({
							name: `${data.keyName} (Auto-rotated)`,
							keyHash,
							prefix,
							serviceId: data.serviceId,
							// A nova chave expira no mesmo tempo que a anterior durou (ex: +30 dias) ou null
							expiresAt: null 
						});

						rotationData = { new_key_id: newKey.id, new_token: fullApiKey };
						
						// Atualiza settings do serviço para marcar como rotacionado
						rotatedKeys.push(data.keyId);
						await db.update(service)
							.set({ settings: { ...settings, security: { ...settings.security, rotated_keys: rotatedKeys } } })
							.where(eq(service.id, data.serviceId));
					}
				}

				// Envio de Webhook (Aviso ou Rotação)
				if (webhookUrl && isSafeUrl(webhookUrl)) {
					try {
						const payload: any = {
							event: rotationData ? 'api_key.rotated' : 'api_key.expiring',
							service_name: data.serviceName,
							key_name: data.keyName,
							expires_at: data.expiresAt,
							days_remaining: diffDays,
						};
						if (rotationData) {
							payload.new_key = { id: rotationData.new_key_id, token: rotationData.new_token };
							payload.message = `Sua API Key foi rotacionada automaticamente. Use o novo token fornecido. A chave antiga expirará em ${diffDays} dias.`;
						} else {
							payload.message = `Sua API Key '${data.keyName}' expirará em ${diffDays} dia(s).`;
						}

						const body = JSON.stringify(payload);
						const headers: Record<string, string> = { 'Content-Type': 'application/json' };
						if (webhookSecret) {
							headers['X-Hermes-Signature'] = createHmac('sha256', webhookSecret).update(body).digest('hex');
						}

						await fetch(webhookUrl, { method: 'POST', headers, body });
					} catch (err: any) {
						console.error(chalk.red(`[${getTimestamp()}] [JOB] Erro no webhook: ${err.message}`));
					}
				}

				// Log de Email (Mock)
				if (data.ownerEmail) {
					console.log(chalk.cyan(`[${getTimestamp()}] [JOB] [EMAIL] Alerta de ${rotationData ? 'ROTAÇÃO' : 'Expiração'} enviado para ${data.ownerEmail}`));
				}

				await db.update(api_key).set({ notification_sent_at: new Date() }).where(eq(api_key.id, data.keyId));
			}
		}

		console.log(chalk.blue.bold(`[${getTimestamp()}] [JOB] Varredura finalizada.`));
	} catch (error) {
		console.error(chalk.red.bold(`[${getTimestamp()}] [JOB] Erro crítico na varredura:`), error);
		throw error;
	}
}
