import { db } from '../config/dbConfig';
import { user } from '../config/db/schema';
import { UserType } from '../types/types';
import { parseDatabaseError } from '../utils/helpers/dbErrors';
import chalk from 'chalk';

class UserRepository {
	private db: typeof db;

	constructor() {
		this.db = db;
	}

	async createAdminUserIfNotExists(adminData: UserType & { id: string }): Promise<void> {
		try {
			const response = await this.db
				.insert(user)
				.values({
					id: adminData.id,
					name: adminData.name,
					email: adminData.email,
					emailVerified: adminData.emailVerified ?? false,
					password: adminData.password,
					image: adminData.image ?? null,
				})
				.onConflictDoNothing()
				.returning();

			if (response.length > 0) {
				console.log(
					chalk.green.bold(
						'[UserRepository] [createAdminUserIfNotExists] Usuário admin criado com sucesso!',
					),
				);
			} else {
				console.log(
					chalk.yellow.bold(
						'[UserRepository] [createAdminUserIfNotExists] Usuário admin já existe. Nenhuma ação necessária.',
					),
				);
			}
		} catch (error) {
			const parsedError = parseDatabaseError(error, 'Erro ao criar usuário admin');
			console.error(
				chalk.red.bold(
					'[UserRepository] [createAdminUserIfNotExists] Erro ao criar usuário admin:',
				),
				parsedError,
			);
			throw parsedError;
		}
	}

	async createUser(userData: UserType & { id: string }): Promise<UserType> {
		console.log(chalk.blue.bold('[UserRepository] [createUser] Criando usuário...'));

		try {
			const createdUser = await this.db
				.insert(user)
				.values({
					id: userData.id,
					name: userData.name,
					email: userData.email,
					emailVerified: userData.emailVerified ?? false,
					password: userData.password,
					image: userData.image ?? null,
				})
				.returning();

			const insertedUser = createdUser[0];

			console.log(chalk.green.bold('[UserRepository] [createUser] Usuário criado com sucesso!'));

			return {
				...insertedUser,
				createdAt: insertedUser.createdAt ?? undefined,
				updatedAt: insertedUser.updatedAt ?? undefined,
			};
		} catch (error) {
			const parsedError = parseDatabaseError(error, 'Erro ao criar usuário');
			console.error(
				chalk.red.bold('[UserRepository] [createUser] Erro ao criar usuário:'),
				parsedError,
			);
			throw parsedError;
		}
	}
}

export default UserRepository;
