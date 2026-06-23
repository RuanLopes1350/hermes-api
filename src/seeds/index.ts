import { dbConnect, db } from '../config/dbConfig.js';
import { seedUsers } from './userSeeds.js';
import { seedServices } from './serviceSeeds.js';
import { seedTemplates } from './templateSeeds.js';
import { seedEmails } from './emailSeeds.js';
import { seedNotifications } from './notificationSeeds.js';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';

async function runSeeds() {
	console.log(chalk.yellow('Conectando ao banco de dados para rodar as seeds...'));
	await dbConnect.connect();

	try {
		console.log(chalk.yellow('Limpando o banco de dados antes do seed...'));
		// Dropando e recriando para limpar de forma bruta. Em prod não se deve fazer isso.
		await db.execute(sql`
			TRUNCATE TABLE "user" CASCADE;
			TRUNCATE TABLE "service" CASCADE;
			TRUNCATE TABLE "template" CASCADE;
			TRUNCATE TABLE "email" CASCADE;
			TRUNCATE TABLE "credential" CASCADE;
			TRUNCATE TABLE "notification" CASCADE;
		`);

		console.log(chalk.blue('Populando usuários...'));
		const users = await seedUsers();

		console.log(chalk.blue('Populando serviços...'));
		const services = await seedServices(users);

		console.log(chalk.blue('Populando templates...'));
		const templates = await seedTemplates(users, services);

		console.log(chalk.blue('Populando e-mails...'));
		await seedEmails(services, templates);

		console.log(chalk.blue('Populando notificações...'));
		await seedNotifications(services);

		console.log(chalk.green('Seeds finalizadas com sucesso!'));

		console.log(chalk.cyan('\nLogins Criados:'));
		console.log(chalk.cyan('Admin: admin@hermes.com | Senha: password123'));
		console.log(chalk.cyan('Usuário 1: user@hermes.com | Senha: password123'));
		console.log(chalk.cyan('Usuário 2: outro@hermes.com | Senha: password123\n'));
	} catch (error) {
		console.error(chalk.red('Erro ao rodar seeds:'), error);
	} finally {
		await dbConnect.disconnect();
		process.exit(0);
	}
}

runSeeds();
