import { db } from '../config/dbConfig.js';
import { credential } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { generateSecureApiKey } from '../utils/apiKeyGenerate.js';
import { encryptPasskey } from '../service/credentialService.js';
import { daysAgo, daysFromNow } from './seedHelpers.js';

interface CredentialSeedSpec {
	name: string;
	serviceIndex: number;
	creator: any;
	authType: 'plain' | 'oauth2';
	login: string;
	smtpHost?: string;
	smtpPort?: number;
	smtpSecure?: boolean;
	passkey?: string;
	clientId?: string;
	clientSecret?: string;
	isActive?: boolean;
	expiresAt?: Date | null;
	deletedAt?: Date | null;
	createdAt: Date;
}

// Gera as chaves reais (Argon2 + AES-256-GCM) usadas pela aplicação — as
// credenciais seedadas são funcionalmente idênticas às criadas pela UI, só
// os valores de origem (senha SMTP, client secret) é que são fictícios.
export async function seedCredentials(users: any[], services: any[]) {
	const [admin, , user1, user2, carlos, ana, beatriz] = users;

	const specs: CredentialSeedSpec[] = [
		// --- E-commerce API ---
		{
			name: 'SendGrid Produção',
			serviceIndex: 0,
			creator: user1,
			authType: 'plain',
			login: 'apikey',
			smtpHost: 'smtp.sendgrid.net',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'SG.demo_1a2b3c4d5e6f7g8h9i0j',
			createdAt: daysAgo(85),
		},
		{
			name: 'Gmail Suporte (OAuth2)',
			serviceIndex: 0,
			creator: user1,
			authType: 'oauth2',
			login: 'suporte@hermes.com',
			clientId: 'demo-client-id.apps.googleusercontent.com',
			clientSecret: 'GOCSPX-demo_client_secret_value',
			createdAt: daysAgo(80),
		},
		{
			// Inativa de propósito — dispara o alerta "Credenciais Inativas
			// Detectadas" no dashboard de user1/user2.
			name: 'SMTP Legado (Desativado)',
			serviceIndex: 0,
			creator: user2,
			authType: 'plain',
			login: 'legado@ecommerce.com',
			smtpHost: 'mail.ecommerce-legado.com',
			smtpPort: 465,
			smtpSecure: true,
			passkey: 'senha-antiga-2024',
			isActive: false,
			createdAt: daysAgo(200),
		},

		// --- Marketing Newsletter ---
		{
			name: 'Mailgun Marketing',
			serviceIndex: 1,
			creator: user1,
			authType: 'plain',
			login: 'postmaster@mg.hermes.com',
			smtpHost: 'smtp.mailgun.org',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'mg_demo_key_9f8e7d6c5b4a',
			createdAt: daysAgo(70),
		},
		{
			// expiresAt em 2 dias — aparece como "próxima da expiração".
			name: 'Chave Campanha Q3',
			serviceIndex: 1,
			creator: ana,
			authType: 'plain',
			login: 'campanhas@hermes.com',
			smtpHost: 'smtp.mailgun.org',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'mg_demo_key_campanha_q3',
			expiresAt: daysFromNow(2),
			createdAt: daysAgo(28),
		},

		// --- Internal System Admin ---
		{
			name: 'Gmail Infra (OAuth2)',
			serviceIndex: 2,
			creator: admin,
			authType: 'oauth2',
			login: 'infra@hermes.com',
			clientId: 'demo-infra-client-id.apps.googleusercontent.com',
			clientSecret: 'GOCSPX-demo_infra_secret',
			createdAt: daysAgo(115),
		},
		{
			// Soft-deleted — testa se a listagem/contagem de credenciais ativas
			// realmente ignora linhas com deletedAt preenchido.
			name: 'Chave Antiga (Removida)',
			serviceIndex: 2,
			creator: admin,
			authType: 'plain',
			login: 'antiga@hermes.com',
			smtpHost: 'smtp.antigo-provedor.com',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'senha-removida',
			createdAt: daysAgo(110),
			deletedAt: daysAgo(60),
		},

		// --- CRM Notificações ---
		{
			name: 'SMTP CRM',
			serviceIndex: 3,
			creator: user2,
			authType: 'plain',
			login: 'crm@hermes.com',
			smtpHost: 'smtp.sendinblue.com',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'sib_demo_key_crm',
			createdAt: daysAgo(55),
		},

		// --- App Mobile Notifier ---
		{
			name: 'SMTP Push Mobile',
			serviceIndex: 4,
			creator: carlos,
			authType: 'plain',
			login: 'mobile@hermes.com',
			smtpHost: 'smtp.amazonses.com',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'ses_demo_key_mobile',
			createdAt: daysAgo(48),
		},
		{
			name: 'SMTP Push iOS (Legado)',
			serviceIndex: 4,
			creator: beatriz,
			authType: 'plain',
			login: 'ios@hermes.com',
			smtpHost: 'smtp.amazonses.com',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'ses_demo_key_ios',
			isActive: false,
			createdAt: daysAgo(45),
		},

		// --- Faturamento Automático ---
		{
			name: 'SMTP Faturamento',
			serviceIndex: 5,
			creator: ana,
			authType: 'plain',
			login: 'faturamento@hermes.com',
			smtpHost: 'smtp.sendgrid.net',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'SG.demo_faturamento_key',
			createdAt: daysAgo(38),
		},

		// --- Sistema de RH ---
		{
			name: 'SMTP RH',
			serviceIndex: 6,
			creator: beatriz,
			authType: 'plain',
			login: 'rh@hermes.com',
			smtpHost: 'smtp.office365.com',
			smtpPort: 587,
			smtpSecure: false,
			passkey: 'o365_demo_key_rh',
			createdAt: daysAgo(32),
		},
	];

	const rowsToInsert = await Promise.all(
		specs.map(async (spec) => {
			const { fullApiKey, keyHash, prefix } = await generateSecureApiKey();
			return {
				id: uuidv4(),
				name: spec.name,
				auth_type: spec.authType,
				smtp_host: spec.smtpHost ?? (spec.authType === 'oauth2' ? 'smtp.gmail.com' : ''),
				smtp_port: spec.smtpPort ?? (spec.authType === 'oauth2' ? 465 : 587),
				smtp_secure: spec.smtpSecure ?? spec.authType === 'oauth2',
				login: spec.login,
				passkey: spec.passkey ? encryptPasskey(spec.passkey) : null,
				client_id: spec.clientId ?? null,
				client_secret: spec.clientSecret ? encryptPasskey(spec.clientSecret) : null,
				key_hash: keyHash,
				prefix,
				is_active: spec.isActive ?? true,
				expiresAt: spec.expiresAt ?? null,
				service_id: services[spec.serviceIndex].id,
				creator_id: spec.creator.id,
				createdAt: spec.createdAt,
				deletedAt: spec.deletedAt ?? null,
				// não é uma coluna real — só carona pro console.log de exemplo abaixo
				__fullApiKey: fullApiKey,
			};
		}),
	);

	const sampleKey = rowsToInsert[0].__fullApiKey;

	const insertedCredentials = await db
		.insert(credential)
		.values(rowsToInsert.map(({ __fullApiKey, ...row }) => row))
		.returning();

	console.log(
		chalk.cyan(
			`[Seeds] Exemplo de API Key funcional (${rowsToInsert[0].name}): ${sampleKey}`,
		),
	);

	return insertedCredentials;
}
