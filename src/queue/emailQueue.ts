import { Queue } from 'bullmq';
import { redisConfig } from '../config/redisConfig.js';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';

// Interface do Payload que será trafegado na fila
export interface EmailJobPayload {
	emailId: string;
	serviceId: string;
	variables?: Record<string, any>;
}

// Instancia a fila principal de despachos de e-mail
export const emailQueue = new Queue<EmailJobPayload>('email-queue', {
	connection: redisConfig,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: 'exponential',
			delay: 5000, // 5 segundos, depois 25s, etc.
		},
		removeOnComplete: true, // Remove job finalizado com sucesso para não poluir o Redis
		removeOnFail: false, // Mantém jobs falhos para inspeção
	},
});

emailQueue.on('error', (err) => {
	console.error(chalk.red.bold(`[${getTimestamp()}] [BULLMQ] Erro na Fila 'email-queue':`), err);
});
