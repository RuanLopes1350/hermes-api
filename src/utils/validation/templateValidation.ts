import { z } from 'zod';

// Schema para criação de template
export const createTemplateSchema = z.object({
	name: z
		.string()
		.min(3, 'O nome do template deve ter no mínimo 3 caracteres.')
		.max(100, 'O nome não pode exceder 100 caracteres.'),
	// Assunto do e-mail — pode conter variáveis Handlebars: ex: "Bem-vindo, {{name}}!"
	subject_template: z
		.string()
		.max(500, 'O subject template não pode exceder 500 caracteres.')
		.optional(),
	// Conteúdo HTML ou MJML do template
	html_content: z.string().min(1, 'O conteúdo HTML é obrigatório.'),
	// Fallback em texto puro para clientes que não suportam HTML
	text_content: z.string().optional(),
});

// Schema para atualização de template (todos os campos opcionais)
export const updateTemplateSchema = z
	.object({
		name: z
			.string()
			.min(3, 'O nome do template deve ter no mínimo 3 caracteres.')
			.max(100, 'O nome não pode exceder 100 caracteres.')
			.optional(),
		subject_template: z
			.string()
			.max(500, 'O subject template não pode exceder 500 caracteres.')
			.nullable()
			.optional(),
		html_content: z.string().min(1, 'O conteúdo HTML não pode ser vazio.').optional(),
		text_content: z.string().nullable().optional(),
	})
	.refine(
		(data) =>
			data.name !== undefined ||
			data.subject_template !== undefined ||
			data.html_content !== undefined ||
			data.text_content !== undefined,
		{ message: 'Informe ao menos um campo para atualizar.' },
	);

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
