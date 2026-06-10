import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../config/dbConfig.js';
import { bearer } from 'better-auth/plugins';
import { account, user, session, verification } from '../config/db/schema.js';
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

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user,
			account,
			session,
			verification,
		},
	}),

	user: {
		modelName: 'user',
		additionalFields: {
			isAdmin: {
				type: 'boolean',
				required: false,
				defaultValue: false,
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
		autoSignIn: nodeEnv === 'development',
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
