import chalk from 'chalk';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Queue, QueueEvents } from 'bullmq';
import { redisConfig, redisPub } from './config/redisConfig.js';
import { MAX_WORKERS_REDIS_KEY } from './utils/detectMachineCapacity.js';
import { getTimestamp } from './utils/helpers/dateUtils.js';

const execFileAsync = promisify(execFile);

// --- Parâmetros de ajuste fino
const JOBS_PER_WORKER = 20; // quantos jobs esperando "justificam" mais 1 réplica
const IDLE_GRACE_MS = 2 * 60 * 1000; // fila vazia por esse tempo antes de escalar a 0
const POLL_INTERVAL_MS = 20 * 1000;
const DEFAULT_MAX_WORKERS = 1; // usado só se a api ainda não gravou o valor no Redis

// Onde o compose file + .env ficam montados dentro do container do scaler
const COMPOSE_FILE = '/deploy/docker-compose.yml';
const ENV_FILE = '/deploy/.env';

const emailQueue = new Queue('email-queue', { connection: redisConfig });
const queueEvents = new QueueEvents('email-queue', { connection: redisConfig });

let currentTarget = -1; // -1 força a 1ª aplicação a rodar mesmo se calcular "0"
let emptyQueueSince: number | null = null;
let applying = false; // evita duas execuções de 'docker compose' simultâneas

async function getMaxWorkers(): Promise<number> {
	const raw = await redisPub.get(MAX_WORKERS_REDIS_KEY);
	const parsed = Number(raw);
	return parsed > 0 ? parsed : DEFAULT_MAX_WORKERS;
}

async function computeDesiredReplicas(): Promise<number> {
	const { waiting, active } = await emailQueue.getJobCounts('waiting', 'active');
	const pending = waiting + active;
	const max = await getMaxWorkers();

	if (pending === 0) {
		if (emptyQueueSince === null) emptyQueueSince = Date.now();
		const idleFor = Date.now() - emptyQueueSince;
		if (idleFor >= IDLE_GRACE_MS) return 0;
		// Ainda dentro da janela de carência: segura o valor atual (não escala ainda)
		return currentTarget < 0 ? 0 : currentTarget;
	}

	emptyQueueSince = null;
	const desired = Math.ceil(pending / JOBS_PER_WORKER);
	return Math.max(1, Math.min(desired, max));
}

async function applyScale(n: number) {
	if (n === currentTarget || applying) return;
	applying = true;
	console.log(
		chalk.blue(`[${getTimestamp()}] [Scaler] Ajustando email-worker: ${currentTarget} -> ${n}`),
	);
	try {
		await execFileAsync(
			'docker',
			[
				'compose',
				'-f',
				COMPOSE_FILE,
				'--env-file',
				ENV_FILE,
				'--profile',
				'prod',
				'up',
				'-d',
				'--scale',
				`email-worker=${n}`,
				'--no-recreate',
			],
			{ cwd: '/deploy' },
		);
		currentTarget = n;
		console.log(chalk.green(`[${getTimestamp()}] [Scaler] email-worker agora em ${n} réplica(s).`));
	} catch (err: any) {
		console.error(chalk.red(`[${getTimestamp()}] [Scaler] Falha ao escalar:`), err.message);
	} finally {
		applying = false;
	}
}

async function tick() {
	try {
		const desired = await computeDesiredReplicas();
		await applyScale(desired);
	} catch (err) {
		console.error(chalk.red(`[${getTimestamp()}] [Scaler] Erro ao avaliar escala:`), err);
	}
}

queueEvents.on('waiting', () => {
	tick();
});

queueEvents.on('error', (err) => {
	console.error(chalk.red(`[${getTimestamp()}] [Scaler] Erro no QueueEvents:`), err);
});

setInterval(tick, POLL_INTERVAL_MS);

console.log(
	chalk.cyan.bold(`
  ==============================================================
    📈 HERMES SCALER - AUTOSCALING DO EMAIL-WORKER 📈
  ==============================================================
    [Iniciado]: ${chalk.yellow.bold(getTimestamp())}
  ==============================================================
        `),
);

tick();
