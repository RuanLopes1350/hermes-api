import {
	pgTable,
	varchar,
	boolean,
	text,
	integer,
	timestamp,
	jsonb,
	pgEnum,
	unique,
	index,
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
	isActive: boolean('is_active').notNull().default(true),
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

export const priority_enum = pgEnum('priority_enum', ['high', 'medium', 'low']);

export const auth_type_enum = pgEnum('auth_type_enum', ['plain', 'oauth2']);

export const service = pgTable('service', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	creator_id: text('creator_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	settings: jsonb('settings').default('{}'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	deletedAt: timestamp('deleted_at'),
});

export const service_member_role_enum = pgEnum('service_member_role_enum', ['owner', 'member']);

export const service_member = pgTable(
	'service_member',
	{
		id: text('id').primaryKey().notNull(),
		service_id: text('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'cascade' }),
		user_id: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: service_member_role_enum('role').notNull().default('member'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		unq: unique().on(t.service_id, t.user_id),
	}),
);

export const credential = pgTable('credential', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	auth_type: auth_type_enum('auth_type').notNull().default('plain'),
	smtp_host: varchar('smtp_host').notNull(),
	smtp_port: integer('smtp_port').notNull(),
	smtp_secure: boolean('smtp_secure').notNull().default(false),
	login: varchar('login').notNull(),
	passkey: text('passkey'),
	client_id: text('client_id'),
	client_secret: text('client_secret'),
	refresh_token: text('refresh_token'),
	key_hash: text('key_hash').notNull().unique(),
	prefix: varchar('prefix').notNull(),
	is_active: boolean('is_active').notNull().default(true),
	expiresAt: timestamp('expires_at'),
	service_id: text('service_id')
		.notNull()
		.references(() => service.id, { onDelete: 'cascade' }),
	creator_id: text('creator_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	deletedAt: timestamp('deleted_at'),
});

export const template = pgTable('template', {
	id: text('id').primaryKey().notNull(),
	name: varchar('name').notNull(),
	service_id: text('service_id').references(() => service.id, { onDelete: 'cascade' }),
	creator_id: text('creator_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	global: boolean('global').notNull().default(false),
	subject_template: varchar('subject_template'),
	html_content: text('html_content').notNull(),
	compiled_html: text('compiled_html'),
	text_content: text('text_content'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	deletedAt: timestamp('deleted_at'),
});

export const email = pgTable(
	'email',
	{
		id: text('id').primaryKey().notNull(),
		service_id: text('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'cascade' }),
		credential_id: text('credential_id').references(() => credential.id, { onDelete: 'set null' }),
		service_template_id: text('service_template_id').references(() => template.id, {
			onDelete: 'set null',
		}),
		subject: varchar('subject').notNull(),
		recipient_to: varchar('recipient_to').notNull(),
		body: text('body'),
		variables: jsonb('variables').default('{}'),
		status: mail_status_enum('status').notNull().default('pending'),
		priority: priority_enum('priority').notNull().default('medium'),
		retry_count: integer('retry_count').notNull().default(0),
		next_retry_at: timestamp('next_retry_at'),
		scheduled_at: timestamp('scheduled_at'),
		error_log: text('error_log'),
		sent_at: timestamp('sent_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		deletedAt: timestamp('deleted_at'),
	},
	(table) => ({
		serviceIdIdx: index('email_service_id_idx').on(table.service_id),
		createdAtIdx: index('email_created_at_idx').on(table.createdAt),
		serviceStatusDeletedIdx: index('email_srv_status_del_idx').on(
			table.service_id,
			table.status,
			table.deletedAt,
		),
	}),
);

export const service_log = pgTable('service_log', {
	id: text('id').primaryKey().notNull(),
	service_id: text('service_id')
		.notNull()
		.references(() => service.id, { onDelete: 'cascade' }),
	actor_id: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
	action: varchar('action').notNull(),
	description: text('description').notNull(),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const template_log = pgTable('template_log', {
	id: text('id').primaryKey().notNull(),
	template_id: text('template_id')
		.notNull()
		.references(() => template.id, { onDelete: 'cascade' }),
	actor_id: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
	action: varchar('action').notNull(),
	description: text('description').notNull(),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});
