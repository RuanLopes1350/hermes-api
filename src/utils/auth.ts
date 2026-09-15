import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../config/dbConfig.js';
import { bearer } from 'better-auth/plugins';
import { account, user, session, verification } from '../config/db/schema.js';
import { redisStorage } from '@better-auth/redis-storage';
import { redisCache } from '../config/redisConfig.js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const secret = process.env.AUTH_SECRET;
const baseURL = process.env.AUTH_BASE_URL || 'http://localhost:3001';

const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS || 'http://localhost:3000')
	.split(',')
	.map((origin) => origin.trim());

// Determina se devemos usar cookies seguros baseados na env ou no protocolo da baseURL
const isSecure =
	process.env.AUTH_SECURE_COOKIES === 'true' ||
	(nodeEnv === 'production' && process.env.AUTH_SECURE_COOKIES !== 'false') ||
	baseURL.startsWith('https');

export const auth = betterAuth({
	secret: secret,
	baseURL: baseURL,
	basePath: '/api/auth',
	rateLimit: {
		enabled: true,
		window: 60, // 1 minuto
		max: 10, // máximo de 10 requisições
	},

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user,
			account,
			session,
			verification,
		},
	}),

	// Cacheia leituras de sessão em Redis (Postgres continua sendo a fonte de verdade).
	// Reduz a carga no banco a cada chamada de requireAuth.
	secondaryStorage: redisStorage({
		client: redisCache,
		keyPrefix: 'hermes-auth:',
	}),

	session: {
		// Sem isso, com secondaryStorage configurado o Better Auth para de
		// escrever sessões no Postgres (passam a existir só no Redis) — quebra
		// a revogação de sessão via internalAdapter.deleteUserSessions (ver
		// userService.revokeUserSessions) e qualquer leitura de `session` direto
		// no banco (ex.: contagem de sessões ativas do dashboard).
		storeSessionInDatabase: true,
	},

	user: {
		modelName: 'user',
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'user',
				input: true,
			},
			isActive: {
				type: 'boolean',
				required: false,
				defaultValue: true,
				input: true,
			},
		},
	},

	plugins: [bearer()],

	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		resetPasswordTokenExpiresIn: 3600, // 1 hora
		sendResetPassword: async ({ user, url, token }) => {
			try {
				const settingsService = (await import('../service/settingsService.js')).default;
				const { transporter, fromAddress } = await settingsService.createSystemTransporter();

				await transporter.sendMail({
					from: fromAddress,
					to: user.email,
					subject: 'Recuperação de Senha — Hermes Gateway',
					text: `Olá, ${user.name}!\n\nRecebemos uma solicitação para redefinir a sua senha no Hermes Gateway.\n\nPara cadastrar uma nova senha, acesse o link abaixo:\n${url}\n\nEste link expira em 1 hora.\nSe você não solicitou a alteração, ignore este e-mail.`,
					html: `
						<div style="background-color: #f4f5f7; padding: 40px 20px; font-family: Helvetica, Arial, sans-serif;">
							<div style="max-width: 540px; margin: 0 auto; background: #ffffff; padding: 40px 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
								<h2 style="color: #1e293b; text-align: center; margin-bottom: 24px;">Hermes Gateway</h2>
								<hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
								<p style="font-size: 16px; color: #334155; line-height: 24px;">Olá, <strong>${user.name}</strong>,</p>
								<p style="font-size: 15px; color: #475569; line-height: 24px;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Hermes</strong>.</p>
								<div style="text-align: center; margin: 32px 0;">
									<a href="${url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
										Redefinir Minha Senha
									</a>
								</div>
								<p style="font-size: 13px; color: #64748b; line-height: 20px;">Ou copie e cole o link no seu navegador:<br/>
									<a href="${url}" style="color: #2563eb; word-break: break-all;">${url}</a>
								</p>
								<p style="font-size: 12px; color: #dc2626; margin-top: 24px;">Atenção: Se você não solicitou este link, nenhuma alteração será feita.</p>
							</div>
						</div>
					`,
				});
				console.log(`[BetterAuth] E-mail de reset de senha enviado para: ${user.email}`);
			} catch (error) {
				console.error('[BetterAuth] Falha ao enviar e-mail de recuperação de senha:', error);
				throw error;
			}
		},
	},

	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || '',
			clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
		},
	},

	advanced: {
		useSecureCookies: isSecure,
		ipAddress: {
			ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'],
		},
		crossSubDomainCookies: {
			enabled: !!process.env.AUTH_COOKIE_DOMAIN,
			domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
		},
		defaultCookieAttributes: {
			sameSite: isSecure ? 'none' : 'lax',
			secure: isSecure,
			httpOnly: true,
		},
	},
	trustedOrigins: trustedOrigins,
});
