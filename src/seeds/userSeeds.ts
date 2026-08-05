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
			role: 'super_admin',
		},
		{
			name: 'Usuário Comum',
			email: 'user@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Outro Usuário',
			email: 'outro@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Carlos Silva',
			email: 'carlos.silva@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Ana Souza',
			email: 'ana.souza@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Beatriz Costa',
			email: 'beatriz.costa@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Fernanda Santos',
			email: 'fernanda.santos@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Marcos Oliveira',
			email: 'marcos.oliveira@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Rafael Pereira',
			email: 'rafael.pereira@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'João Rodrigues',
			email: 'joao.rodrigues@hermes.com',
			password: 'password123',
			role: 'user',
		},
		{
			name: 'Juliana Almeida',
			email: 'juliana.almeida@hermes.com',
			password: 'password123',
			role: 'user',
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
				.set({ role: u.role as 'super_admin' | 'admin' | 'user', emailVerified: true })
				.where(eq(user.id, result.user.id))
				.returning();

			createdUsers.push(updated[0]);
		} catch (e: any) {
			console.log(chalk.red(`Falha ao criar o usuário ${u.email}: ${e.message}`));
		}
	}

	return createdUsers;
}
