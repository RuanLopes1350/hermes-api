import chalk from 'chalk';
import { dbConnect } from './config/dbConfig.js';
import { getTimestamp } from './utils/helpers/dateUtils.js';
import { setupSystemJobs } from './queue/systemWorker.js';

const NODE_ENV = process.env.NODE_ENV || 'development';

async function startSystemProcess() {
	console.log(
		chalk.cyan.bold(`
    ==============================================================
    🕐 HERMES SYSTEM WORKER - JOBS AGENDADOS (CRON) 🕐
    ==============================================================
    [Ambiente]:    ${chalk.yellow.bold(NODE_ENV)}
    [Iniciado]:    ${chalk.yellow.bold(new Date().toLocaleDateString('pt-BR'))} às ${chalk.yellow.bold(getTimestamp())}
    ==============================================================
        `),
	);

	try {
		console.log(chalk.yellow.bold(`\n[${getTimestamp()}] [DB] Conectando ao banco de dados...`));
		await dbConnect.connect();
		console.log(chalk.green.bold(`[${getTimestamp()}] [SYSTEM] Banco de dados conectado.`));

		await setupSystemJobs();
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao conectar ao banco de dados: ${error}`),
		);
		process.exit(1);
	}
}

async function gracefulShutdow(signal: string) {
	console.log(
		chalk.yellow.bold(`\n[${getTimestamp()}] [SYSTEM] Recebido sinal ${signal}. Encerrando...`),
	);

	try {
		await dbConnect.disconnect();
		console.log(chalk.green.bold(`[${getTimestamp()}] [DB] Conexão encerrada.`));
	} catch (error) {
		console.error(chalk.red(`[${getTimestamp()}] [ERROR] Erro ao desconectar: ${error}`));
	}
	process.exit(0);
}

process.on('SIGINT', () => gracefulShutdow('SIGINT'));
process.on('SIGTERM', () => gracefulShutdow('SIGTERM'));

startSystemProcess();
