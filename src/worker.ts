import chalk from 'chalk';
import { dbConnect } from './config/dbConfig.js';
import { getTimestamp } from './utils/helpers/dateUtils.js';
// importar o arquivo do worker para inicializar a instância do BullMQ
import './queue/emailWorker.js';
import { setupSystemJobs } from './queue/systemWorker.js';

const NODE_ENV = process.env.NODE_ENV || 'development';

async function startWorker() {
	console.log(
		chalk.cyan.bold(`
  ==============================================================
    ⚙️  HERMES WORKER - PROCESSAMENTO DE FILAS DE E-MAILS ⚙️
  ==============================================================
    [Ambiente]:    ${chalk.yellow.bold(NODE_ENV)}
    [Iniciado]:    ${chalk.yellow.bold(new Date().toLocaleDateString('pt-BR'))} às ${chalk.yellow.bold(getTimestamp())}
  ==============================================================
        `),
	);

	try {
		console.log(chalk.magenta.bold(`[${getTimestamp()}] [DB] Conectando ao banco de dados...`));
		await dbConnect.connect();
		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [WORKER] Banco de dados conectado. Fila pronta para processar!`,
			),
		);

		// Inicializa os jobs agendados de sistema (como a rotação de API Keys)
		await setupSystemJobs();
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao conectar ao banco de dados: ${error}`),
		);
		process.exit(1);
	}
}

// Graceful shutdown para o worker (importante para não corromper jobs no meio do envio)
const gracefulShutdown = async (signal: string) => {
	console.log(
		chalk.yellow.bold(`\n[${getTimestamp()}] [WORKER] Recebido sinal ${signal}. Encerrando...`),
	);
	try {
		await dbConnect.disconnect();
		console.log(chalk.green.bold(`[${getTimestamp()}] [DB] Conexão encerrada.`));
	} catch (error) {
		console.error(chalk.red(`[${getTimestamp()}] [ERROR] Erro ao desconectar: ${error}`));
	}
	process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startWorker();
