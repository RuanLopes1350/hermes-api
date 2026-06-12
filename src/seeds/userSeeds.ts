import { db } from '../config/dbConfig.js';
import { user } from '../config/db/schema.js';
import { auth } from '../utils/auth.js';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

export async function seedUsers() {
	const usersToCreate = [
		{
			name: 'Admin Master',
			email: 'admin@hermes.com',
			password: 'password123',
			isAdmin: true,
		},
		{
			name: 'Usuário Comum',
			email: 'user@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Outro Usuário',
			email: 'outro@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Carlos Silva',
			email: 'carlos.silva@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Ana Souza',
			email: 'ana.souza@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Beatriz Costa',
			email: 'beatriz.costa@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Fernanda Santos',
			email: 'fernanda.santos@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Marcos Oliveira',
			email: 'marcos.oliveira@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Rafael Pereira',
			email: 'rafael.pereira@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'João Rodrigues',
			email: 'joao.rodrigues@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
		{
			name: 'Juliana Almeida',
			email: 'juliana.almeida@hermes.com',
			password: 'password123',
			isAdmin: false,
		},
	];

	const createdUsers = [];

	for (const u of usersToCreate) {
		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: u.name,
					email: u.email,
					password: u.password,
				},
			});

			const updated = await db
				.update(user)
				.set({ isAdmin: u.isAdmin, emailVerified: true })
				.where(eq(user.id, result.user.id))
				.returning();

			createdUsers.push(updated[0]);
		} catch (e: any) {
			console.log(chalk.red(`Falha ao criar o usuário ${u.email}: ${e.message}`));
		}
	}

	return createdUsers;
}
