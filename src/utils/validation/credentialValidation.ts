import { z } from 'zod';

const smtpPortSchema = z
	.coerce
	.number()
	.int('A porta SMTP deve ser um número inteiro.')
	.min(1, 'A porta SMTP deve ser maior que 0.')
	.max(65535, 'A porta SMTP deve ser menor ou igual a 65535.');

const smtpSecureSchema = z.preprocess(
	(value) => {
		if (typeof value === 'string') {
			const normalized = value.trim().toLowerCase();
			if (normalized === 'true' || normalized === '1') return true;
			if (normalized === 'false' || normalized === '0') return false;
		}
		return value;
	},
	z.boolean({ message: 'O campo smtpSecure deve ser booleano (true/false).' }),
);

// Schema para criação de credencial SMTP
export const createCredentialSchema = z.object({
	name: z
		.string()
		.min(3, 'O nome da credencial deve ter no mínimo 3 caracteres.')
		.max(100, 'O nome não pode exceder 100 caracteres.'),
	login: z
		.string()
		.email('O login deve ser um e-mail válido.')
		.max(255, 'O login não pode exceder 255 caracteres.'),
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

// Schema para atualização de credencial (todos os campos opcionais)
export const updateCredentialSchema = z
	.object({
		name: z
			.string()
			.min(3, 'O nome da credencial deve ter no mínimo 3 caracteres.')
			.max(100, 'O nome não pode exceder 100 caracteres.')
			.optional(),
		smtpHost: z
			.string()
			.min(3, 'O host SMTP deve ter no mínimo 3 caracteres.')
			.max(255, 'O host SMTP não pode exceder 255 caracteres.')
			.optional(),
		smtpPort: smtpPortSchema.optional(),
		smtpSecure: smtpSecureSchema.optional(),
		login: z
			.string()
			.email('O login deve ser um e-mail válido.')
			.max(255, 'O login não pode exceder 255 caracteres.')
			.optional(),
		passkey: z
			.string()
			.min(1, 'A senha SMTP é obrigatória.')
			.max(500, 'A senha SMTP não pode exceder 500 caracteres.')
			.optional(),
	})
	.refine(
		(data) => data.name !== undefined || data.login !== undefined || data.passkey !== undefined,
		{ message: 'Informe ao menos um campo para atualizar: name, login ou passkey.' },
	);

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
