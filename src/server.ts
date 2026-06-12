import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import { dbConnect } from './config/dbConfig.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';
import { isAPIError } from 'better-auth/api';
import { errorHandler } from './middlewares/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importação das rotas
import userRouter from './routes/userRoutes.js';
import serviceRouter from './routes/serviceRoutes.js';
import credentialRouter from './routes/credentialRoutes.js';
import templateRouter from './routes/templateRoutes.js';
import emailRouter from './routes/emailRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import { getTimestamp } from './utils/helpers/dateUtils.js';

dotenv.config({ quiet: true });

const adminName = process.env.ADMIN_NAME || 'Admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD;

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 1350;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 1. Configuração de CORS (Deve ser o primeiro)
const allowedOrigins = (process.env.AUTH_TRUSTED_ORIGINS || 'http://localhost:3000')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin: allowedOrigins.length > 0 ? allowedOrigins : true,
		credentials: true,
	}),
);

// 2. Parsers de Body (Devem vir antes das rotas)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para log de requisições HTTP no Console
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

// 3. Handler do Better-Auth
app.all('/api/auth/*path', toNodeHandler(auth));

// 4. Rotas da API
app.get('/', (req, res) => {
	res.redirect('/api/health');
});
app.get('/api/health', (req, res) => {
	res.json({ message: `Hermes API rodando. UpTime: ${process.uptime().toFixed(2)}s` });
});

try {
	const swaggerFile = path.resolve(__dirname, 'swagger-output.json');
	if (fs.existsSync(swaggerFile)) {
		const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFile, 'utf8'));
		app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
	} else {
		console.log(
			chalk.yellow(
				`[Swagger] Arquivo swagger-output.json não encontrado. Rode "npm run docs:generate" para criá-lo.`,
			),
		);
	}
} catch (error) {
	console.error(chalk.red(`[Swagger] Erro ao carregar documentação: ${error}`));
}

app.use('/api', userRouter);
app.use('/api', serviceRouter);
app.use('/api', credentialRouter);
app.use('/api', templateRouter);
app.use('/api', emailRouter);
app.use('/api', dashboardRouter);

app.use(errorHandler);

async function createAdminUser() {
	if (!adminName || !adminEmail || !adminPassword) return;
	try {
		await auth.api.signUpEmail({
			body: { name: adminName, email: adminEmail, password: adminPassword, isAdmin: true },
		});
		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] Usuário admin pronto.`));
	} catch (error) {
		if (isAPIError(error) && error.statusCode === 422) return;
		console.error(chalk.red.bold(`[${getTimestamp()}] [ERROR] Erro no Admin: ${error}`));
	}
}

async function startServer() {
	try {
		await dbConnect.connect();
		app.listen(PORT, () => {
			console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] Hermes API na porta ${PORT}`));
		});
		await createAdminUser();
	} catch (error) {
		console.error(chalk.red.bold(`[${getTimestamp()}] [ERROR] Falha no boot: ${error}`));
		process.exit(1);
	}
}

startServer();
