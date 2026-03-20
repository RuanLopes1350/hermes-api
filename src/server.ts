import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import { dbConnect } from './config/dbConfig';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth';
import { isAPIError } from 'better-auth/api';

// Importação das rotas
import userRouter from './routes/userRoutes';
import serviceRouter from './routes/serviceRoutes';
import apiKeyRouter from './routes/apiKeyRoutes';

const userRoutes = userRouter;
const serviceRoutes = serviceRouter;
const apiKeyRoutes = apiKeyRouter;

dotenv.config({ quiet: true });

const adminName = process.env.ADMIN_NAME || 'Admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD;

const app = express();
const PORT = process.env.PORT || 1350;
const NODE_ENV = process.env.NODE_ENV || 'development';
const allowedOrigins = (process.env.AUTH_TRUSTED_ORIGINS || 'http://localhost:3000')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

export function getTimestamp() {
	return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

// Middleware para log de requisições HTTP
app.use((req, res, next) => {
	const start = process.hrtime();
	res.on('finish', () => {
		const [sec, nano] = process.hrtime(start);
		const ms = (sec * 1000 + nano / 1e6).toFixed(2);
		let statusColor;
		if (res.statusCode >= 200 && res.statusCode < 300) {
			statusColor = chalk.green;
		} else if (res.statusCode >= 300 && res.statusCode < 400) {
			statusColor = chalk.cyan;
		} else if (res.statusCode >= 400 && res.statusCode < 500) {
			statusColor = chalk.yellow;
		} else {
			statusColor = chalk.red;
		}
		console.log(
			`${chalk.gray(`[${getTimestamp()}]`)} [${req.method}] ${req.originalUrl} - ` +
				`${statusColor(res.statusCode)} ${chalk.gray(`${ms}ms`)}`,
		);
	});
	next();
});

app.use(
	cors({
		origin: allowedOrigins.length > 0 ? allowedOrigins : true,
		credentials: true,
	}),
);

// Middleware para autenticação das rotas de auth
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

// Rotas base
app.get('/', (req, res) => {
	res.redirect('/api/health');
});
app.get('/api', (req, res) => {
	res.redirect('/api/health');
});
app.get('/api/health', (req, res) => {
	res.json({ message: `Hermes API rodando. \nUpTime: ${process.uptime().toFixed(2)} segundos!` });
});

// Rotas de recursos
app.use('/api', userRoutes);
app.use('/api', serviceRoutes);
app.use('/api', apiKeyRoutes);

function showWelcomeBanner() {
	const version = ''; // Você pode puxar isso do package.json depois se quiser

	console.log(
		chalk.cyan.bold(`
  ==============================================================
    🚀  HERMES API - MICROSSERVIÇO DE EMAILS TRANSACIONAIS  📧
  ==============================================================
    [CRIADO POR]:  ${chalk.yellow.bold('Ruan Lopes')}
    [REPOSITÓRIO]: ${chalk.yellow.bold('https://github.com/ruanlopes/hermes-api')}
    [Ambiente]:    ${chalk.yellow.bold(NODE_ENV)}
    [Versão]:      ${chalk.yellow.bold(version)}
    [Iniciado]:    ${chalk.yellow.bold(new Date().toLocaleDateString('pt-BR'))} às ${chalk.yellow.bold(getTimestamp())}
  ==============================================================
`),
	);
}

async function createAdminUser() {
	if (!adminName || !adminEmail || !adminPassword) {
		console.warn(
			chalk.yellow.bold(
				`[${getTimestamp()}] [WARNING] Variáveis ADMIN_NAME, ADMIN_EMAIL ou ADMIN_PASSWORD não definidas. Usuário admin não será criado.`,
			),
		);
		return;
	}

	try {
		await auth.api.signUpEmail({
			body: {
				name: adminName,
				email: adminEmail,
				password: adminPassword,
				isAdmin: true,
			},
		});
		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] Usuário admin criado com sucesso.`));
	} catch (error) {
		if (isAPIError(error) && error.statusCode === 422) {
			console.log(chalk.yellow.bold(`[${getTimestamp()}] [INFO] Usuário admin já existe.`));
			return;
		}

		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao criar usuário admin: ${error}`),
		);
	}
}

async function startServer() {
	showWelcomeBanner();
	try {
		// Conectando ao Banco de Dados
		console.log(chalk.blue.bold(`[${getTimestamp()}] [SERVER] Inicializando o servidor...`));
		try {
			console.log(chalk.magenta.bold(`[${getTimestamp()}] [DB] Conectando ao banco de dados...`));
			await dbConnect.connect();
			app.listen(PORT, () => {
				console.log(
					chalk.green.bold(`[${getTimestamp()}] [SUCCESS] Servidor rodando na porta ${PORT}`),
				);
			});
		} catch (error) {
			console.error(
				chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao conectar ao banco de dados: ${error}`),
			);
			process.exit(1);
		}

		// Criando usuário admin
		await createAdminUser();
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao iniciar o servidor: ${error}`),
		);
		process.exit(1);
	}
}

process.on('SIGINT', async () => {
	console.log(
		chalk.yellow.bold(
			`\n[${getTimestamp()}] [SERVER] Recebido sinal de interrupção. Encerrando...`,
		),
	);
	try {
		await dbConnect.disconnect();
		console.log(
			chalk.green.bold(`[${getTimestamp()}] [DB] Conexão com o banco de dados encerrada.`),
		);
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao desconectar do banco de dados: ${error}`),
		);
	}
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log(
		chalk.yellow.bold(`\n[${getTimestamp()}] [SERVER] Recebido sinal de término. Encerrando...`),
	);
	try {
		await dbConnect.disconnect();
		console.log(
			chalk.green.bold(`[${getTimestamp()}] [DB] Conexão com o banco de dados encerrada.`),
		);
	} catch (error) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro ao desconectar do banco de dados: ${error}`),
		);
	}
	process.exit(0);
});

startServer();
