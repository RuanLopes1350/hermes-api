import { dbConnect, db } from '../config/dbConfig.js';
import { seedUsers } from './userSeeds.js';
import { seedServices } from './serviceSeeds.js';
import { seedCredentials } from './credentialSeeds.js';
import { seedTemplates } from './templateSeeds.js';
import { seedEmails } from './emailSeeds.js';
import { seedServiceLogs } from './serviceLogSeeds.js';
import { seedNotifications } from './notificationSeeds.js';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const environment: string = process.env.NODE_ENV!;

async function runSeeds() {
	if (environment !== 'development') {
		console.log(chalk.red('Ambiente não é de Desenvolvimento, barrando execução de seeds!'));
		process.exit(1);
	}

	console.log(chalk.yellow('Conectando ao banco de dados para rodar as seeds...'));
	await dbConnect.connect();
	try {
		console.log(chalk.yellow('Limpando o banco de dados antes do seed...'));
		// Dropando e recriando para limpar de forma bruta. Em prod não se deve fazer isso.
		// TRUNCATE ... CASCADE em "user"/"service"/"template" já arrasta as tabelas
		// dependentes (session, account, service_member, credential, email,
		// service_log, template_log) — listamos tudo explicitamente só por clareza.
		await db.execute(sql`
			TRUNCATE TABLE "user" CASCADE;
			TRUNCATE TABLE "service" CASCADE;
			TRUNCATE TABLE "service_member" CASCADE;
			TRUNCATE TABLE "template" CASCADE;
			TRUNCATE TABLE "template_log" CASCADE;
			TRUNCATE TABLE "email" CASCADE;
			TRUNCATE TABLE "credential" CASCADE;
			TRUNCATE TABLE "service_log" CASCADE;
			TRUNCATE TABLE "notification" CASCADE;
		`);

		console.log(chalk.blue('Populando usuários...'));
		const users = await seedUsers();

		console.log(chalk.blue('Populando serviços e membros...'));
		const { services, members } = await seedServices(users);

		console.log(chalk.blue('Populando credenciais...'));
		const credentials = await seedCredentials(users, services);

		console.log(chalk.blue('Populando templates...'));
		const templates = await seedTemplates(users, services);

		console.log(chalk.blue('Populando e-mails (45 dias de histórico)...'));
		const emails = await seedEmails(services, templates, credentials);

		console.log(chalk.blue('Populando trilha de auditoria (service_log)...'));
		await seedServiceLogs(services, members, users, credentials);

		console.log(chalk.blue('Populando notificações...'));
		await seedNotifications(services, users);

		console.log(chalk.green('Seeds finalizadas com sucesso!'));
		console.log(
			chalk.green(
				`  ${users.length} usuários, ${services.length} serviços, ${credentials.length} credenciais, ` +
					`${templates.length} templates, ${emails.length} e-mails.`,
			),
		);

		console.log(chalk.cyan('\nLogins criados (senha: password123):'));
		console.log(chalk.cyan('  Super Admin : admin@hermes.com'));
		console.log(chalk.cyan('  Admin       : bruno.tavares@hermes.com'));
		console.log(chalk.cyan('  Usuário     : user@hermes.com'));
		console.log(chalk.cyan('  Usuário     : outro@hermes.com'));
		console.log(
			chalk.yellow(
				'  Suspenso    : juliana.almeida@hermes.com  (isActive=false — não consegue logar; ' +
					'útil pra testar o fluxo de conta desativada e o SSE de deslogue forçado)',
			),
		);
	} catch (error) {
		console.error(chalk.red('Erro ao rodar seeds:'), error);
	} finally {
		await dbConnect.disconnect();
		process.exit(0);
	}
}

runSeeds();
