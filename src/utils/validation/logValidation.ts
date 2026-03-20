import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const logCreateSchema = z
	.object({
		id: z.string().uuid('ID deve ser um UUID válido').optional(),
		method: z
			.string()
			.min(1, 'O método HTTP é obrigatório')
			.max(10, 'O método HTTP deve ter no máximo 10 caracteres')
			.transform((value) => value.toUpperCase())
			.refine((method) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method), {
				message: 'Método HTTP inválido',
			}),
		endpoint: z.string().min(1, 'O endpoint é obrigatório').max(2048, 'Endpoint muito longo'),
		status_code: z.number().int().min(100).max(599),
		ip_address: z.string().max(64, 'IP deve ter no máximo 64 caracteres').nullable().optional(),
		api_key_id: z.string().uuid('ID da API key deve ser um UUID válido').nullable().optional(),
		user_id: z.string().uuid('ID do usuário deve ser um UUID válido').nullable().optional(),
	})
	.openapi('LogCreate');

// Compatibilidade com código já existente
export const logSchema = logCreateSchema;
