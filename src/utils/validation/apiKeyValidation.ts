import { z } from 'zod';

export const createApiKeySchema = z.object({
	name: z
		.string()
		.min(3, 'O nome da API Key deve ter no mínimo 3 caracteres.')
		.max(100, 'O nome da API Key não pode exceder 100 caracteres.'),
	serviceId: z.string().min(1, 'O ID do serviço é obrigatório.'),
    // NOVO: Amarrando a Chave a uma Credencial específica
	credentialId: z.string().min(1, 'O ID da credencial é obrigatório.'),
	expires_at: z
		.string()
		.datetime({ message: 'A data de expiração deve ser um formato ISO válido.' })
		.optional()
		.nullable(),
});

export const updateApiKeySchema = z.object({
	name: z.string().min(3).max(100).optional(),
	is_active: z.boolean().optional(),
	expires_at: z.string().datetime().optional().nullable(),
});
