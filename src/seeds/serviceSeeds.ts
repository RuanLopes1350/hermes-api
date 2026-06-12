import { db } from '../config/dbConfig.js';
import { service, service_member } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedServices(users: any[]) {
	const [admin, user1, user2, carlos, ana, beatriz] = users;

	const servicesToInsert = [
		{
			id: uuidv4(),
			name: 'E-commerce API',
			creator_id: user1.id,
			settings: { defaultPriority: 'medium' },
		},
		{
			id: uuidv4(),
			name: 'Marketing Newsletter',
			creator_id: user1.id,
			settings: { defaultPriority: 'low' },
		},
		{
			id: uuidv4(),
			name: 'Internal System Admin',
			creator_id: admin.id,
			settings: { defaultPriority: 'high' },
		},
		{
			id: uuidv4(),
			name: 'CRM Notificações',
			creator_id: user2.id,
			settings: { defaultPriority: 'medium' },
		},
		{
			id: uuidv4(),
			name: 'App Mobile Notifier',
			creator_id: carlos.id,
			settings: { defaultPriority: 'high' },
		},
		{
			id: uuidv4(),
			name: 'Faturamento Automático',
			creator_id: ana.id,
			settings: { defaultPriority: 'medium' },
		},
		{
			id: uuidv4(),
			name: 'Sistema de RH',
			creator_id: beatriz.id,
			settings: { defaultPriority: 'low' },
		},
	];

	const membersToInsert = [
		// E-commerce API (owner: user1, member: user2, carlos)
		{ id: uuidv4(), service_id: servicesToInsert[0].id, user_id: user1.id, role: 'owner' as const },
		{
			id: uuidv4(),
			service_id: servicesToInsert[0].id,
			user_id: user2.id,
			role: 'member' as const,
		},
		{
			id: uuidv4(),
			service_id: servicesToInsert[0].id,
			user_id: carlos.id,
			role: 'member' as const,
		},

		// Marketing Newsletter (owner: user1, member: ana)
		{ id: uuidv4(), service_id: servicesToInsert[1].id, user_id: user1.id, role: 'owner' as const },
		{ id: uuidv4(), service_id: servicesToInsert[1].id, user_id: ana.id, role: 'member' as const },

		// Internal System Admin (owner: admin, member: user1, user2)
		{ id: uuidv4(), service_id: servicesToInsert[2].id, user_id: admin.id, role: 'owner' as const },
		{
			id: uuidv4(),
			service_id: servicesToInsert[2].id,
			user_id: user1.id,
			role: 'member' as const,
		},
		{
			id: uuidv4(),
			service_id: servicesToInsert[2].id,
			user_id: user2.id,
			role: 'member' as const,
		},

		// CRM Notificações (owner: user2)
		{ id: uuidv4(), service_id: servicesToInsert[3].id, user_id: user2.id, role: 'owner' as const },

		// App Mobile Notifier (owner: carlos, member: beatriz)
		{
			id: uuidv4(),
			service_id: servicesToInsert[4].id,
			user_id: carlos.id,
			role: 'owner' as const,
		},
		{
			id: uuidv4(),
			service_id: servicesToInsert[4].id,
			user_id: beatriz.id,
			role: 'member' as const,
		},

		// Faturamento Automático (owner: ana)
		{ id: uuidv4(), service_id: servicesToInsert[5].id, user_id: ana.id, role: 'owner' as const },

		// Sistema de RH (owner: beatriz, member: admin)
		{
			id: uuidv4(),
			service_id: servicesToInsert[6].id,
			user_id: beatriz.id,
			role: 'owner' as const,
		},
		{
			id: uuidv4(),
			service_id: servicesToInsert[6].id,
			user_id: admin.id,
			role: 'member' as const,
		},
	];

	const insertedServices = await db.insert(service).values(servicesToInsert).returning();
	await db.insert(service_member).values(membersToInsert);

	return insertedServices;
}
