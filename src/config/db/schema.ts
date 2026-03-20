import {
	pgTable,
	varchar,
	boolean,
	text,
	integer,
	timestamp,
	jsonb,
	pgEnum,
} from 'drizzle-orm/pg-core';

// ==================================================================================
// ============================== BETTER-AUTH =======================================
// ==================================================================================
export const user = pgTable('user', {
	id: text('id').primaryKey().notNull(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	password: text('password'), // HASH
	isAdmin: boolean('is_admin').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
	id: text('id').primaryKey().notNull(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
	id: text('id').primaryKey().notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey().notNull(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==================================================================================
// ============================== HERMES ============================================
// ==================================================================================

export const mail_status_enum = pgEnum('mail_status_enum', [
	'pending',
	'sent',
	'failed',
	'retrying',
]);

export const service = pgTable('service', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	creator_id: text('creator_id')
		.notNull()
		.references(() => user.id),
	owner_id: text('owner_id')
		.notNull()
		.references(() => user.id),
	settings: jsonb('settings').default('{}'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const api_key = pgTable('api_key', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	key_hash: text('key_hash').notNull().unique(),
	prefix: varchar('prefix').notNull(),
	service_id: text('service_id')
		.notNull()
		.references(() => service.id),
	is_active: boolean('is_active').notNull().default(true),
	last_used_at: timestamp('last_used_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const credential = pgTable('credential', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	login: varchar('login').notNull(),
	passkey: varchar('passkey').notNull(), // HASH
	service_id: text('service_id')
		.notNull()
		.references(() => service.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const template = pgTable('template', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	service_id: text('service_id').references(() => service.id),
	subject_template: varchar('subject_template'),
	html_content: text('html_content').notNull(),
	text_content: text('text_content'), // Fallback caso html não seja aceito
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const email = pgTable('email', {
	id: text('id').primaryKey().notNull(),
	service_id: text('service_id')
		.notNull()
		.references(() => service.id),
	credential_id: text('credential_id').references(() => credential.id),
	service_template_id: text('service_template_id').references(() => template.id),
	subject: varchar('subject').notNull(),
	recipient_to: varchar('recipient_to').notNull(),
	body: text('body'),
	status: mail_status_enum('status').notNull().default('pending'),
	retry_count: integer('retry_count').notNull().default(0),
	next_retry_at: timestamp('next_retry_at'),
	scheduled_at: timestamp('scheduled_at'),
	error_log: text('error_log'),
	sent_at: timestamp('sent_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const logs = pgTable('logs', {
	id: text('id').primaryKey().notNull(),
	method: varchar('method').notNull(),
	status_code: integer('status_code').notNull(),
	endpoint: varchar('endpoint').notNull(),
	ip_address: varchar('ip_address'),
	api_key_id: text('api_key_id')
		.references(() => api_key.id),
	user_id: text('user_id')
		.references(() => user.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});
