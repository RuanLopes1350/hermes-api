import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const credentialCreateSchema = z
	.object({
		id: z.string().uuid('ID deve ser um UUID válido').optional().openapi({
			description: 'UUID da credencial',
			example: '123e4567-e89b-12d3-a456-426614174000',
		}),
		name: z
			.string()
			.min(1, 'O nome é obrigatório')
			.max(255, 'O nome deve ter no máximo 255 caracteres')
			.openapi({ description: 'Nome da credencial', example: 'Credencial de Email' }),
		login: z
			.string()
			.min(1, 'O login é obrigatório')
			.max(255, 'O login deve ter no máximo 255 caracteres')
			.openapi({ description: 'Login da credencial', example: 'usuario@example.com' }),
		passkey: z
			.string()
			.min(8, 'A passkey deve ter no mínimo 8 caracteres')
			.max(255, 'A passkey deve ter no máximo 255 caracteres')
			.openapi({ description: 'Passkey da credencial (HASH)', example: 's3cur3P@ssw0rdHash' }),
		service_id: z.string().uuid('O ID do serviço deve ser um UUID válido').openapi({
			description: 'UUID do serviço associado',
			example: '123e4567-e89b-12d3-a456-426614174000',
		}),
	})
	.openapi('CredentialCreate');

export const credentialUpdateSchema = credentialCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('CredentialUpdate');

// Compatibilidade com código já existente
export const credentialSchema = credentialCreateSchema;
