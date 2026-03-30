import { Queue, Worker } from 'bullmq';
import { redisConfig } from '../config/redisConfig.js';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { processApiKeyRotation } from '../jobs/apiKeyRotationJob.js';

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
			await processApiKeyRotation();
		}
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
		chalk.magenta.bold(`[${getTimestamp()}] [SYSTEM] Jobs agendados com sucesso (BullMQ Repeatable).`),
	);
}

systemWorker.on('failed', (job, err) => {
	console.error(
		chalk.red.bold(`[${getTimestamp()}] [SYSTEM] Job '${job?.name}' falhou: ${err.message}`),
	);
});
