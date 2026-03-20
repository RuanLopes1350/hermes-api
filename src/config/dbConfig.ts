import 'dotenv/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import chalk from 'chalk';
import { getTimestamp } from '../server';

const db_url = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: db_url });
export const db = drizzle(pool, { schema });

const db_login = process.env.POSTGRES_USER;
const db_host = process.env.POSTGRES_HOST;
const db_port = process.env.POSTGRES_PORT;
const db_name = process.env.POSTGRES_DB;
const db_urlFiltered = 'postgresql://USUARIO:SENHA@localhost:5432/hermes'

export class dbConnect {
	static async connect(): Promise<void> {
		console.log(
			chalk.magenta.bold(`\n[${getTimestamp()}] [DB] Configuração do banco de dados iniciada.`),
		);
		console.log(chalk.magenta.bold(`[${getTimestamp()}] [DB] Host: ${chalk.cyan.bold(db_host)}`));
		console.log(chalk.magenta.bold(`[${getTimestamp()}] [DB] Porta: ${chalk.cyan.bold(db_port)}`));
		console.log(
			chalk.magenta.bold(`[${getTimestamp()}] [DB] Banco de Dados: ${chalk.cyan.bold(db_name)}`),
		);
		console.log(
			chalk.magenta.bold(`[${getTimestamp()}] [DB] Usuário: ${chalk.cyan.bold(db_login)}`),
		);
		console.log(
			chalk.magenta.bold(
				`[${getTimestamp()}] [DB] Senha: ${chalk.cyan.bold('CONTATE O ADMINISTRADOR')}`,
			),
		);

		try {
			const client = await pool.connect();
			client.release();
			console.log(
				chalk.green.bold(`[${getTimestamp()}] [SUCCESS] Conectado ao banco de dados com sucesso!`),
			);
			console.log(
				chalk.magenta.bold(
					`[${getTimestamp()}] [DB] Banco de dados rodando em: ${chalk.cyan.bold(db_urlFiltered)}`,
				),
			);
		} catch (error) {
			console.error(
				chalk.red.bold(
					`[${getTimestamp()}] [ERROR] Falha na conexão com o banco de dados - Erro: ${error}`,
				),
			);
			process.exit(1);
		}
	}

	static async disconnect(): Promise<void> {
		try {
			await pool.end();
			console.log(
				chalk.green.bold(
					`[${getTimestamp()}] [SUCCESS] Conexão com o banco de dados encerrada com sucesso!`,
				),
			);
		} catch (error) {
			console.error(
				chalk.red.bold(
					`[${getTimestamp()}] [ERROR] Erro ao desconectar do banco de dados - Erro: ${error}`,
				),
			);
		}
	}
}
