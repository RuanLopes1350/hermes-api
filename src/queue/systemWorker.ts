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
		// ============================================================================
		// JOB MASTER: Roda à meia-noite e apenas agenda os micro-jobs
		// ============================================================================
		if (job.name === 'api-key-rotation') {
			console.log(chalk.blue(`[${getTimestamp()}] [SYSTEM_MASTER] Verificando chaves para rotação...`));
			
			const { db } = await import('../config/dbConfig.js');
			const { credential, service } = await import('../config/db/schema.js');
			const { eq, and, isNull, isNotNull } = await import('drizzle-orm');

			// JOIN super otimizado para evitar N+1 queries
			const activeCredentials = await db.select({
				cred: credential,
				serviceSettings: service.settings
			})
			.from(credential)
			.innerJoin(service, eq(credential.service_id, service.id))
			.where(
				and(
					eq(credential.is_active, true),
					isNull(credential.deletedAt),
					isNotNull(credential.expiresAt)
				)
			);

			let queuedCount = 0;

			for (const row of activeCredentials) {
				const settings = row.serviceSettings as any;
				const autoRotate = settings?.security?.auto_rotate;
				const webhookUrl = settings?.notifications?.webhook_url;
				const webhookSecret = settings?.notifications?.webhook_secret;

				// Ignora quem não configurou o webhook ou desativou o auto_rotate
				if (!autoRotate || !webhookUrl || !webhookSecret) continue;

				// Pega o Threshold configurado pelo usuário (fallback = 3)
				const thresholdDays = Number(settings?.security?.rotate_threshold_days) || 3;
				
				const thresholdDate = new Date();
				thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

				// Se a data de expiração da chave for menor que a data limite, enfileira
				if (row.cred.expiresAt! < thresholdDate) {
					await systemQueue.add('rotate-single-key', {
						credentialId: row.cred.id,
						serviceId: row.cred.service_id
					}, {
						// Evita que o mesmo job seja enfileirado duas vezes no mesmo dia acidentalmente
						jobId: `rotate-${row.cred.id}-${new Date().toISOString().split('T')[0]}`
					});
					queuedCount++;
				}
			}

			console.log(chalk.green(`[${getTimestamp()}] [SYSTEM_MASTER] Varredura concluída. ${queuedCount} chave(s) agendada(s) para rotação imediata.`));
			return;
		}

		// ============================================================================
		// JOB INDIVIDUAL (MICRO-JOB): Gira a chave de 1 credencial com Retries
		// ============================================================================
		if (job.name === 'rotate-single-key') {
			const { credentialId, serviceId } = job.data;
			
			const { db } = await import('../config/dbConfig.js');
			const { credential, service } = await import('../config/db/schema.js');
			const { eq } = await import('drizzle-orm');
			const crypto = await import('node:crypto');
			const { dispatchWebhook } = await import('../utils/webhookDispatcher.js');
			const serviceLogRepository = (await import('../repository/serviceLogRepository.js')).default;

			const [cred] = await db.select().from(credential).where(eq(credential.id, credentialId));
			const [srv] = await db.select().from(service).where(eq(service.id, serviceId));

			if (!cred || !srv) throw new Error('Credencial ou Serviço não encontrado.');

			const settings = srv.settings as any;
			const webhookUrl = settings?.notifications?.webhook_url;
			const webhookSecret = settings?.notifications?.webhook_secret;
			const intervalDays = Number(settings?.security?.rotation_interval_days) || 30;

			// 1. Gera Nova Chave
			const rawKey = crypto.randomBytes(32).toString('hex');
			const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
			const prefix = `HRMS-${rawKey.slice(0, 7)}`;
			
			// 2. Calcula nova validade com base na preferência do usuário
			const newExpiry = new Date();
			newExpiry.setDate(newExpiry.getDate() + intervalDays);

			const payload = {
				serviceId: cred.service_id,
				credentialId: cred.id,
				newApiKey: rawKey,
				rotatedAt: new Date().toISOString(),
				expiresAt: newExpiry.toISOString()
			};

			// 3. TENTA DISPARAR O WEBHOOK PRIMEIRO!
			try {
				await dispatchWebhook(webhookUrl, webhookSecret, payload);
			} catch (error: any) {
				// SE FALHAR AQUI, JOGA O ERRO. 
				// O BullMQ vai capturar, agendar um Backoff de 1min/2min e tentar de novo até 3 vezes!
				// A chave no banco de dados AINDA NÃO FOI alterada, então o usuário não perde o acesso.
				await serviceLogRepository.insertLog({
					service_id: serviceId,
					actor_id: null,
					action: 'API_KEY_ROTATION_WARNING',
					description: `Tentativa de rotação automática falhou ao notificar webhook: ${error.message}. O sistema tentará novamente.`,
					metadata: { credential_id: credentialId }
				});

				// === GATILHO DE NOTIFICAÇÃO ===
				const notificationRepository = (await import('../repository/notificationRepository.js')).default;
				await notificationRepository.insert({
					service_id: serviceId,
					type: 'warning',
					title: 'Falha na Rotação Automática',
					message: `A tentativa de rotacionar a chave "${cred.name}" falhou pois o webhook recusou a conexão. Tentaremos novamente em breve.`
				});

				throw new Error(`Falha no webhook: ${error.message}`);
			}

			// 4. Sucesso no Webhook! Cliente já tem a nova chave. Atualizamos o Banco em paz.
			await db.update(credential)
				.set({
					key_hash: keyHash,
					prefix: prefix,
					expiresAt: newExpiry,
					updatedAt: new Date()
				})
				.where(eq(credential.id, credentialId));

			// 5. Log de Sucesso Absoluto
			await serviceLogRepository.insertLog({
				service_id: serviceId,
				actor_id: null,
				action: 'API_KEY_ROTATED_AUTO',
				description: `Chave "${cred.name}" rotacionada automaticamente. Validade: +${intervalDays} dias.`,
				metadata: { credential_id: credentialId, newExpiry }
			});

			// === GATILHO DE NOTIFICAÇÃO (Sucesso) ===
			const notificationRepository = (await import('../repository/notificationRepository.js')).default;
			await notificationRepository.insert({
				service_id: serviceId,
				type: 'success',
				title: 'Chave Rotacionada',
				message: `A chave "${cred.name}" foi rotacionada automaticamente com sucesso.`
			});

			console.log(chalk.green(`[${getTimestamp()}] [SYSTEM_WORKER] Chave ${credentialId} rotacionada com sucesso.`));
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
