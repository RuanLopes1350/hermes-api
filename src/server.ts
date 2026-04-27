import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chalk from 'chalk';
import { dbConnect } from './config/dbConfig.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';
import { isAPIError } from 'better-auth/api';
import { errorHandler } from './middlewares/errorHandler.js';

// Importação das rotas
import userRouter from './routes/userRoutes.js';
import serviceRouter from './routes/serviceRoutes.js';
import apiKeyRouter from './routes/apiKeyRoutes.js';
import credentialRouter from './routes/credentialRoutes.js';
import templateRouter from './routes/templateRoutes.js';
import emailRouter from './routes/emailRoutes.js';
import logRouter from './routes/logRoutes.js';
import { processApiKeyRotation } from './jobs/apiKeyRotationJob.js';
import { getTimestamp } from './utils/helpers/dateUtils.js';

dotenv.config({ quiet: true });

const adminName = process.env.ADMIN_NAME || 'Admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD;

const app = express();
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

// 3. Handler do Better-Auth
app.all('/api/auth/*path', toNodeHandler(auth));

// 4. Rotas da API
app.get('/', (req, res) => {
	res.redirect('/api/health');
});
app.get('/api/health', (req, res) => {
	res.json({ message: `Hermes API rodando. UpTime: ${process.uptime().toFixed(2)}s` });
});

app.use('/api', userRouter);
// Nota: Certifique-se de que o import de serviceRouter está correto conforme seu arquivo físico
import serviceRoutes from './routes/serviceRoutes.js'; 
app.use('/api', serviceRoutes);
app.use('/api', apiKeyRouter);
app.use('/api', logRouter);
app.use('/api', credentialRouter);
app.use('/api', templateRouter);
app.use('/api', emailRouter);

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
		processApiKeyRotation();
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
