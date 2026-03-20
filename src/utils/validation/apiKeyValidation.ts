import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const apiKeyCreateSchema = z
	.object({
		id: z.string().uuid('ID deve ser um UUID válido').optional().openapi({
			description: 'UUID da chave de API',
			example: '123e4567-e89b-12d3-a456-426614174000',
		}),
		name: z
			.string()
			.min(1, 'O nome é obrigatório')
			.max(255, 'O nome deve ter no máximo 255 caracteres')
			.openapi({ description: 'Nome da chave de API', example: 'Chave de API do Serviço X' }),
		key_hash: z
			.string()
			.min(64, 'O hash da chave deve conter 64 caracteres (SHA-256 em hex)')
			.max(128, 'O hash da chave de API está em formato inválido')
			.regex(/^[a-fA-F0-9]+$/, 'O hash da chave deve conter apenas caracteres hexadecimais')
			.openapi({
				description: 'Hash da chave de API (recomendado SHA-256 em hexadecimal)',
				example: '0f4a8b3d5c9e71aa2f3d6c8b1e4f6a7099d1c2b3e4f5a6b7c8d9e0f1a2b3c4d5',
			}),
		prefix: z
			.string()
			.min(3, 'O prefixo deve ter no mínimo 3 caracteres')
			.max(20, 'O prefixo deve ter no máximo 20 caracteres')
			.regex(/^[a-zA-Z0-9_]+$/, 'O prefixo deve conter apenas letras, números e underscore')
			.openapi({ description: 'Prefixo visível da chave', example: 'sk_live' }),
		service_id: z.string().uuid('ID do serviço deve ser um UUID válido').openapi({
			description: 'UUID do serviço associado à chave de API',
			example: '123e4567-e89b-12d3-a456-426614174000',
		}),
		is_active: z
			.boolean()
			.default(true)
			.openapi({ description: 'Indica se a chave de API está ativa', example: true }),
		last_used_at: z.coerce.date().nullable().optional().openapi({
			description: 'Data/hora do último uso da chave',
			example: '2026-03-20T12:00:00.000Z',
		}),
	})
	.openapi('ApiKeyCreate');

export const apiKeyUpdateSchema = apiKeyCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('ApiKeyUpdate');

// Compatibilidade com código já existente
export const apiKeySchema = apiKeyCreateSchema;
