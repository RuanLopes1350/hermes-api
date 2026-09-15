import { z } from 'zod';

export const updateMailSettingsSchema = z.object({
	provider: z.enum(['smtp', 'google_oauth2'], "O provedor deve ser 'smtp' ou 'google_oauth2'."),
	fromName: z
		.string()
		.min(2, 'o nome do remetente deve ter no mínimo 2 caracteres.')
		.max(100, 'O nome do remetente não pode exceder 100 caracteres.'),
	fromEmail: z.email('E-mail do remetente inválido.'),
	// Campos para SMTP
	smtpHost: z.string().optional(),
	smtpPort: z.number().int().positive().optional(),
	smtpSecure: z.boolean().optional(),
	login: z.string().optional(),
	passkey: z.string().optional(), // Opcional pois pode gerar conflito caso já esteja cadastrado e não queira ser atualizado.
	// Campos para Google OAuth2
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
});

export const updateSecuritySettingsSchema = z.object({
	resetTokenExpiresInMinutes: z
		.number()
		.int('O tempo deve ser um número inteiro.')
		.min(5, 'O tempo mínimo é de 5 minutos.')
		.max(10080, 'O tempo máximo é de 7 dias (10080 minutos).'),
	allowPublicSignUp: z.boolean(),
});

export const testMailSettingsSchema = z.object({
	toEmail: z.email('Informe um e-mail de destino válido.'),
});
