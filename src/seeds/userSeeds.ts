import { db } from '../config/dbConfig.js';
import { user } from '../config/db/schema.js';
import { auth } from '../utils/auth.js';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

// Cada usuário carrega o papel final e o estado de isActive que queremos
// demonstrar — os dois hoje só existem via additionalFields do Better Auth,
// então sempre é criado ativo/user e corrigido num segundo update.
const usersToCreate = [
	{ name: 'Admin Master', email: 'admin@hermes.com', password: 'password123', role: 'super_admin' },
	// Segundo nível de admin — RBAC tem 3 papéis, os seeds antigos só usavam 2.
	{ name: 'Bruno Tavares', email: 'bruno.tavares@hermes.com', password: 'password123', role: 'admin' },
	{ name: 'Usuário Comum', email: 'user@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Outro Usuário', email: 'outro@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Carlos Silva', email: 'carlos.silva@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Ana Souza', email: 'ana.souza@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Beatriz Costa', email: 'beatriz.costa@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Fernanda Santos', email: 'fernanda.santos@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Marcos Oliveira', email: 'marcos.oliveira@hermes.com', password: 'password123', role: 'user' },
	{ name: 'Rafael Pereira', email: 'rafael.pereira@hermes.com', password: 'password123', role: 'user' },
	{ name: 'João Rodrigues', email: 'joao.rodrigues@hermes.com', password: 'password123', role: 'user' },
	{
		name: 'Juliana Almeida',
		email: 'juliana.almeida@hermes.com',
		password: 'password123',
		role: 'user',
		// Conta suspensa — demonstra o badge "Suspensa" na listagem de usuários e
		// o deslogue forçado via SSE (session:revoked) se ela tiver uma aba aberta.
		isActive: false,
	},
] as const;

export async function seedUsers() {
	const createdUsers = [];

	for (const u of usersToCreate) {
		try {
			const result = await auth.api.signUpEmail({
				body: { name: u.name, email: u.email, password: u.password },
			});

			const updated = await db
				.update(user)
				.set({
					role: u.role as 'super_admin' | 'admin' | 'user',
					emailVerified: true,
					isActive: 'isActive' in u ? u.isActive : true,
				})
				.where(eq(user.id, result.user.id))
				.returning();

			createdUsers.push(updated[0]);
		} catch (e: any) {
			console.log(chalk.red(`Falha ao criar o usuário ${u.email}: ${e.message}`));
		}
	}

	return createdUsers;
}
