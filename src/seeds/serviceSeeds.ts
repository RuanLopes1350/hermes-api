import { db } from '../config/dbConfig.js';
import { service, service_member } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { daysAgo } from './seedHelpers.js';

export async function seedServices(users: any[]) {
	const [admin, bruno, user1, user2, carlos, ana, beatriz, fernanda] = users;

	const servicesToInsert = [
		{
			id: uuidv4(),
			name: 'E-commerce API',
			creator_id: user1.id,
			// webhook configurado propositalmente "quebrado" — casa com a notificação
			// de "Falha na Rotação de Chave" (timeout) já seedada em notificationSeeds.
			settings: {
				defaultPriority: 'medium',
				notifications: {
					webhook_url: 'https://webhook.example.com/hermes-rotation',
					webhook_secret: 'whsec_demo_1234567890abcdef',
				},
			},
			createdAt: daysAgo(90),
		},
		{
			id: uuidv4(),
			name: 'Marketing Newsletter',
			creator_id: user1.id,
			settings: { defaultPriority: 'low' },
			createdAt: daysAgo(75),
		},
		{
			id: uuidv4(),
			name: 'Internal System Admin',
			creator_id: admin.id,
			settings: { defaultPriority: 'high' },
			createdAt: daysAgo(120),
		},
		{
			id: uuidv4(),
			name: 'CRM Notificações',
			creator_id: user2.id,
			settings: { defaultPriority: 'medium' },
			createdAt: daysAgo(60),
		},
		{
			id: uuidv4(),
			name: 'App Mobile Notifier',
			creator_id: carlos.id,
			settings: { defaultPriority: 'high' },
			createdAt: daysAgo(50),
		},
		{
			id: uuidv4(),
			name: 'Faturamento Automático',
			creator_id: ana.id,
			settings: { defaultPriority: 'medium' },
			createdAt: daysAgo(40),
		},
		{
			id: uuidv4(),
			name: 'Sistema de RH',
			creator_id: beatriz.id,
			settings: { defaultPriority: 'low' },
			createdAt: daysAgo(35),
		},
		{
			id: uuidv4(),
			name: 'Sistema Legado (Descontinuado)',
			creator_id: admin.id,
			settings: { defaultPriority: 'low' },
			// Soft-deleted de propósito — testa se as agregações do dashboard e as
			// listagens realmente excluem serviços com deletedAt preenchido.
			createdAt: daysAgo(200),
			deletedAt: daysAgo(30),
		},
	];

	const membersToInsert = [
		// E-commerce API (owner: user1, member: user2, carlos)
		{ id: uuidv4(), service_id: servicesToInsert[0].id, user_id: user1.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[0].id, user_id: user2.id, role: 'member' as const },
		{ id: uuidv4(), service_id: servicesToInsert[0].id, user_id: carlos.id, role: 'member' as const },

		// Marketing Newsletter (owner: user1, member: ana)
		{ id: uuidv4(), service_id: servicesToInsert[1].id, user_id: user1.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[1].id, user_id: ana.id, role: 'member' as const },

		// Internal System Admin (owner: admin, member: bruno, user1, user2)
		{ id: uuidv4(), service_id: servicesToInsert[2].id, user_id: admin.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[2].id, user_id: bruno.id, role: 'member' as const },
		{ id: uuidv4(), service_id: servicesToInsert[2].id, user_id: user1.id, role: 'member' as const },
		{ id: uuidv4(), service_id: servicesToInsert[2].id, user_id: user2.id, role: 'member' as const },

		// CRM Notificações (owner: user2, member: bruno)
		{ id: uuidv4(), service_id: servicesToInsert[3].id, user_id: user2.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[3].id, user_id: bruno.id, role: 'member' as const },

		// App Mobile Notifier (owner: carlos, member: beatriz)
		{ id: uuidv4(), service_id: servicesToInsert[4].id, user_id: carlos.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[4].id, user_id: beatriz.id, role: 'member' as const },

		// Faturamento Automático (owner: ana, member: fernanda)
		{ id: uuidv4(), service_id: servicesToInsert[5].id, user_id: ana.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[5].id, user_id: fernanda.id, role: 'member' as const },

		// Sistema de RH (owner: beatriz, member: admin, fernanda)
		{ id: uuidv4(), service_id: servicesToInsert[6].id, user_id: beatriz.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[6].id, user_id: admin.id, role: 'member' as const },
		{ id: uuidv4(), service_id: servicesToInsert[6].id, user_id: fernanda.id, role: 'member' as const },

		// Sistema Legado (Descontinuado) — só o admin, ninguém mais participa
		{ id: uuidv4(), service_id: servicesToInsert[7].id, user_id: admin.id, role: 'owner' as const },
	];

	const insertedServices = await db.insert(service).values(servicesToInsert).returning();
	const insertedMembers = await db.insert(service_member).values(membersToInsert).returning();

	return { services: insertedServices, members: insertedMembers };
}
