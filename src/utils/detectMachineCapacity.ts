import os from 'os';
import chalk from 'chalk';
import { redisPub } from '../config/redisConfig.js';
import { getTimestamp } from './helpers/dateUtils.js';

export const MAX_WORKERS_REDIS_KEY = 'hermes:autoscale:max_workers';
const MAX_WORKERS_OVERRIDE = process.env.MAX_WORKERS_OVERRIDE || '';

// Ajustar esses dois números observando 'docker stats' em produção depois de um tempo rodando. São estimativas de partida, não uma medição real ainda.
const RESERVED_RAM_MB = 1530; // Reservado para SO + postgres + redis + api + frontend + system-worker + scaler
const RAM_PER_WORKER_MB = 200; // Estimativa conservadora de RAM por réplica do email-worker

// Roda uma vez, no boot da API.
// Se MAX_WORKERS_OVERRIDE estiver setado no .env, usa ele direto e pula a detecção automática (escape hatch manual).
export async function detectAndPublishMaxWorkers(): Promise<number> {
	const override = Number(MAX_WORKERS_OVERRIDE);
	if (override > 0) {
		await redisPub.set(MAX_WORKERS_REDIS_KEY, String(override));
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [Autoscale] MAX_WORKERS_OVERRIDE=${override} (detecção automática ignorada).`,
			),
		);
		return override;
	}

	const totalRamMb = os.totalmem() / 1024 / 1024;
	const cpuCount = os.cpus().length;

	const usableRamMb = Math.max(totalRamMb - RESERVED_RAM_MB, 0);
	const ramBasedMax = Math.floor(usableRamMb / RAM_PER_WORKER_MB);
	const cpuBasedMax = cpuCount;

	const computed = Math.max(1, Math.min(ramBasedMax, cpuBasedMax));

	await redisPub.set(MAX_WORKERS_REDIS_KEY, String(computed));

	console.log(
		chalk.magenta.bold(
			`[${getTimestamp()}] [Autoscale] Máquina: ${totalRamMb.toFixed(0)}MB RAM, ${cpuCount} vCPU(s). ` +
				`Teto de réplicas calculado: ${computed} (RAM permitiria ${ramBasedMax}, CPU permite ${cpuBasedMax}).`,
		),
	);

	return computed;
}
