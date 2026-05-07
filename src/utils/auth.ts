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
		},
	},
	session: {
		modelName: 'session',
	},
	account: {
		modelName: 'account',
	},
	verification: {
		modelName: 'verification',
	},

	plugins: [bearer()],

	emailAndPassword: {
		enabled: true,
		autoSignIn: nodeEnv === 'development',
	},
	advanced: {
		useSecureCookies: process.env.AUTH_SECURE_COOKIES === 'true' || (process.env.NODE_ENV === 'production' && process.env.AUTH_SECURE_COOKIES !== 'false'),
		ipAddress: {
			ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'],
		},
	},
	cookie: {
		domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
	},
	trustedOrigins: trustedOrigins,
});
