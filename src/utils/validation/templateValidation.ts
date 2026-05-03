import { z } from 'zod';

export const createTemplateSchema = z.object({
	name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
	subject_template: z.string().optional(),
	html_content: z.string().min(1, 'O conteúdo HTML é obrigatório'),
	text_content: z.string().optional(),
	global: z.boolean().default(false),
	service_id: z.string().nullable().optional(),
});

export const updateTemplateSchema = z.object({
	name: z.string().min(3).optional(),
	subject_template: z.string().optional(),
	html_content: z.string().optional(),
	text_content: z.string().optional(),
	global: z.boolean().optional(),
	service_id: z.string().nullable().optional(),
});
