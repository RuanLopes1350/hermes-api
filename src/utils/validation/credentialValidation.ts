import { z } from 'zod';

const smtpPortSchema = z.coerce
	.number()
	.int('A porta SMTP deve ser um número inteiro.')
	.min(1, 'A porta SMTP deve ser maior que 0.')
	.max(65535, 'A porta SMTP deve ser menor ou igual a 65535.');

const smtpSecureSchema = z.preprocess((value) => {
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1') return true;
		if (normalized === 'false' || normalized === '0') return false;
	}
	return value;
}, z.boolean({ message: 'O campo smtpSecure deve ser booleano (true/false).' }));

// Schema base compartilhado
const baseCredentialSchema = z.object({
	name: z
		.string()
		.min(3, 'O nome da credencial deve ter no mínimo 3 caracteres.')
		.max(100, 'O nome não pode exceder 100 caracteres.'),
	login: z
		.string()
		.email('O login deve ser um e-mail válido.')
		.max(255, 'O login não pode exceder 255 caracteres.'),
});

// Schema para SMTP Simples
const plainCredentialSchema = baseCredentialSchema.extend({
	authType: z.literal('plain').default('plain'),
	passkey: z
		.string()
		.min(1, 'A senha SMTP é obrigatória.')
		.max(500, 'A senha SMTP não pode exceder 500 caracteres.'),
	smtpHost: z
		.string()
		.min(3, 'O host SMTP deve ter no mínimo 3 caracteres.')
		.max(255, 'O host SMTP não pode exceder 255 caracteres.'),
	smtpPort: smtpPortSchema,
	smtpSecure: smtpSecureSchema,
});

// Schema para Google OAuth2
const oauth2CredentialSchema = baseCredentialSchema.extend({
	authType: z.literal('oauth2'),
	clientId: z.string().min(1, 'Google Client ID é obrigatório.'),
	clientSecret: z.string().min(1, 'Google Client Secret é obrigatório.'),
	// Refresh token não é enviado na criação, é obtido no callback
});

// Schema de união para criação
export const createCredentialSchema = z.discriminatedUnion('authType', [
	plainCredentialSchema,
	oauth2CredentialSchema,
]);

// Schema para atualização (mais flexível)
export const updateCredentialSchema = z.object({
	name: z.string().min(3).max(100).optional(),
	login: z.string().email().max(255).optional(),
	passkey: z.string().min(1).max(500).optional(),
	smtpHost: z.string().min(3).max(255).optional(),
	smtpPort: smtpPortSchema.optional(),
	smtpSecure: smtpSecureSchema.optional(),
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
});

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
