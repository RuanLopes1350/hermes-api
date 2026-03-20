import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const templateCreateSchema = z
	.object({
		id: z.string().uuid('ID deve ser um UUID válido').optional(),
		name: z
			.string()
			.min(1, 'O nome do template é obrigatório')
			.max(255, 'O nome do template deve ter no máximo 255 caracteres'),
		service_id: z.string().uuid('ID do serviço deve ser um UUID válido').nullable().optional(),
		subject_template: z.string().max(255, 'O assunto deve ter no máximo 255 caracteres').nullable().optional(),
		html_content: z.string().min(1, 'O conteúdo HTML é obrigatório'),
		text_content: z.string().nullable().optional(),
	})
	.openapi('TemplateCreate');

export const templateUpdateSchema = templateCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('TemplateUpdate');

// Compatibilidade com código já existente
export const templateSchema = templateCreateSchema;
