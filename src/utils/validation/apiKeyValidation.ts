import { z } from 'zod';

// Schema para criação de API Key
export const createApiKeySchema = z.object({
	name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
	serviceId: z.string().uuid('O ID do serviço deve ser um UUID válido.'),
	expires_at: z.string().datetime().nullable().optional(),
});

// Schema para atualização de API Key (nome e/ou status)
export const updateApiKeySchema = z
	.object({
		name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.').optional(),
		is_active: z.boolean({ message: 'O campo is_active deve ser um booleano.' }).optional(),
		expires_at: z.string().datetime().nullable().optional(),
	})
	.refine(
		(data) =>
			data.name !== undefined || data.is_active !== undefined || data.expires_at !== undefined,
		{
			message: 'Informe ao menos um campo para atualizar: name, is_active ou expires_at.',
		},
	);

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
