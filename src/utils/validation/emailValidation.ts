import { z } from 'zod';

// Schema para enfileiramento de e-mail
export const createEmailSchema = z
	.object({
		subject: z
			.string()
			.min(1, 'O assunto é obrigatório.')
			.max(500, 'O assunto não pode exceder 500 caracteres.'),
		recipient_to: z.string().email('O destinatário deve ser um e-mail válido.'),
		// Conteúdo direto (HTML ou texto) — alternativa ao uso de template
		body: z.string().optional(),
		// ID da credencial SMTP a ser usada (opcional — se não for informada, usa a default do serviço)
		credential_id: z.string().uuid('O credential_id deve ser um UUID válido.').optional(),
		// ID do template a ser usado (opcional — alternativa ao body)
		template_id: z.string().uuid('O template_id deve ser um UUID válido.').optional(),
		// Data/hora agendada para envio (ISO 8601) — preparação para suporte a agendamento
		scheduled_at: z
			.string()
			.datetime({ message: 'scheduled_at deve ser uma data ISO 8601 válida.' })
			.optional(),
		// Variáveis dinâmicas para mesclagem em Templates Handlebars
		variables: z.record(z.string(), z.any()).optional(),
	})
	.refine((data) => data.body !== undefined || data.template_id !== undefined, {
		message: "Informe ao menos um de: 'body' (conteúdo direto) ou 'template_id' (template).",
		path: ['body'],
	});

export type CreateEmailInput = z.infer<typeof createEmailSchema>;
