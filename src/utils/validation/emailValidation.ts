import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const emailStatusSchema = z.enum(['pending', 'sent', 'failed', 'retrying']);

export const emailCreateSchema = z
	.object({
		id: z.string().uuid('ID deve ser um UUID válido').optional(),
		service_id: z.string().uuid('ID do serviço deve ser um UUID válido'),
		credential_id: z.string().uuid('ID da credencial deve ser um UUID válido').nullable().optional(),
		service_template_id: z
			.string()
			.uuid('ID do template deve ser um UUID válido')
			.nullable()
			.optional(),
		subject: z.string().min(1, 'O assunto é obrigatório').max(255, 'O assunto deve ter no máximo 255 caracteres'),
		recipient_to: z.string().email('O destinatário deve ser um email válido'),
		body: z.string().nullable().optional(),
		status: emailStatusSchema.default('pending').optional(),
		retry_count: z.number().int().min(0).default(0).optional(),
		next_retry_at: z.coerce.date().nullable().optional(),
		scheduled_at: z.coerce.date().nullable().optional(),
		error_log: z.string().nullable().optional(),
		sent_at: z.coerce.date().nullable().optional(),
	})
	.refine(
		(data) => !(data.status === 'retrying' && !data.next_retry_at),
		'Quando status for retrying, next_retry_at deve ser informado',
	)
	.openapi('EmailCreate');

export const emailUpdateSchema = emailCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('EmailUpdate');

// Compatibilidade com código já existente
export const emailSchema = emailCreateSchema;
