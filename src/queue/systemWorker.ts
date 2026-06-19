import { Queue, Worker } from 'bullmq';
import { redisConfig } from '../config/redisConfig.js';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';

// 1. Definição da Fila de Sistema
export const systemQueue = new Queue('system-queue', {
	connection: redisConfig,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: 'exponential',
			delay: 60000, // 1 minuto
		},
		removeOnComplete: true,
	},
});

// 2. Definição do Worker de Sistema
export const systemWorker = new Worker(
	'system-queue',
	async (job) => {
		if (job.name === 'api-key-rotation') {
			console.log(chalk.blue(`[${getTimestamp()}] [SYSTEM_WORKER] Iniciando rotação de chaves...`));
			
			const { db } = await import('../config/dbConfig.js');
			const { credential, service } = await import('../config/db/schema.js');
			const { eq, and, isNull, lt, isNotNull } = await import('drizzle-orm');
			const crypto = await import('node:crypto');
			const { dispatchWebhook } = await import('../utils/webhookDispatcher.js');
			const serviceLogRepository = (await import('../repository/serviceLogRepository.js')).default;

			// Limite: expira em menos de 3 dias
			const thresholdDate = new Date();
			thresholdDate.setDate(thresholdDate.getDate() + 3);

			const expiringCredentials = await db.select({
				id: credential.id,
				serviceId: credential.service_id,
				name: credential.name,
				expiresAt: credential.expiresAt
			})
			.from(credential)
			.where(
				and(
					eq(credential.is_active, true),
					isNull(credential.deletedAt),
					isNotNull(credential.expiresAt),
					lt(credential.expiresAt, thresholdDate)
				)
			);

			let rotatedCount = 0;

			for (const cred of expiringCredentials) {
				const [srv] = await db.select().from(service).where(eq(service.id, cred.serviceId));
				const settings = srv?.settings as any;
				const webhookUrl = settings?.notifications?.webhook_url;
				const webhookSecret = settings?.notifications?.webhook_secret;

				if (webhookUrl && webhookSecret) {
					// 1. Gera Nova Chave
					const rawKey = crypto.randomBytes(32).toString('hex');
					const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
					const prefix = `HRMS-${rawKey.slice(0, 7)}`;
					
					// 2. Renova por 30 dias
					const newExpiry = new Date();
					newExpiry.setDate(newExpiry.getDate() + 30);

					// 3. Atualiza BD
					await db.update(credential)
						.set({
							key_hash: keyHash,
							prefix: prefix,
							expiresAt: newExpiry,
							updatedAt: new Date()
						})
						.where(eq(credential.id, cred.id));

					// 4. Dispara Webhook
					const payload = {
						serviceId: cred.serviceId,
						credentialId: cred.id,
						newApiKey: rawKey,
						rotatedAt: new Date().toISOString(),
						expiresAt: newExpiry.toISOString()
					};

					try {
						await dispatchWebhook(webhookUrl, webhookSecret, payload);
						await serviceLogRepository.insertLog({
							service_id: cred.serviceId,
							actor_id: null,
							action: 'API_KEY_ROTATED',
							description: `Chave "${cred.name}" rotacionada com sucesso. Webhook disparado.`,
							metadata: { credential_id: cred.id, newExpiry }
						});
						rotatedCount++;
					} catch (err: any) {
						await serviceLogRepository.insertLog({
							service_id: cred.serviceId,
							actor_id: null,
							action: 'API_KEY_ROTATION_FAILED',
							description: `Chave rotacionada, mas falha ao disparar webhook para "${cred.name}".`,
							metadata: { credential_id: cred.id, error: err.message }
						});
					}
				}
			}

			console.log(chalk.green(`[${getTimestamp()}] [SYSTEM_WORKER] Rotação concluída. ${rotatedCount} chave(s) rotacionada(s).`));
			return;
		}

		console.log(chalk.gray(`[${getTimestamp()}] [SYSTEM_WORKER] Job ${job.name} concluído (desconhecido).`));
	},
	{ connection: redisConfig },
);

// 3. Agendamento do Job Repetível (Executa todos os dias à meia-noite)
export async function setupSystemJobs() {
	// Remove jobs repetíveis antigos para evitar duplicação em caso de mudança de configuração
	const repeatableJobs = await systemQueue.getRepeatableJobs();
	for (const job of repeatableJobs) {
		await systemQueue.removeRepeatableByKey(job.key);
	}

	// Adiciona o job de rotação de chaves
	await systemQueue.add(
		'api-key-rotation',
		{},
		{
			repeat: {
				pattern: '0 0 * * *', // Todo dia à meia-noite
			},
		},
	);

	console.log(
		chalk.magenta.bold(
			`[${getTimestamp()}] [SYSTEM] Jobs agendados com sucesso (BullMQ Repeatable).`,
		),
	);
}

systemWorker.on('failed', (job, err) => {
	console.error(
		chalk.red.bold(`[${getTimestamp()}] [SYSTEM] Job '${job?.name}' falhou: ${err.message}`),
	);
});
