import { z } from 'zod';

// Schema para criação de serviço
export const createServiceSchema = z.object({
	name: z
		.string()
		.min(3, 'O nome do serviço deve ter no mínimo 3 caracteres.')
		.max(100, 'O nome do serviço não pode exceder 100 caracteres.'),
	settings: z.record(z.string(), z.any()).optional().default({}),
});

// Schema para atualização de serviço (todos os campos são opcionais)
export const updateServiceSchema = z
	.object({
		name: z
			.string()
			.min(3, 'O nome do serviço deve ter no mínimo 3 caracteres.')
			.max(100, 'O nome do serviço não pode exceder 100 caracteres.')
			.optional(),
		settings: z.record(z.string(), z.any()).optional(),
	})
	.refine((data) => data.name !== undefined || data.settings !== undefined, {
		message: 'Informe ao menos um campo para atualizar: name ou settings.',
	});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
