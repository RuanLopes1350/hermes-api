import { QueueEvents } from 'bullmq';
import { redisConfig } from '../config/redisConfig.js';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';

// Instância global para escutar os eventos da fila
export const globalQueueEvents = new QueueEvents('email-queue', {
	connection: redisConfig,
});

globalQueueEvents.on('error', (err) => {
	console.error(chalk.red(`[${getTimestamp()}] [QueueEvents] Erro:`), err);
});
