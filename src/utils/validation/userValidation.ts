import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const userCreateSchema = z
	.object({
		id: z
			.string()
			.uuid('ID deve ser um UUID válido')
			.optional()
			.openapi({ description: 'UUID do usuário', example: '123e4567-e89b-12d3-a456-426614174000' }),

		name: z
			.string()
			.min(1, 'O nome é obrigatório')
			.max(255, 'O nome deve ter no máximo 255 caracteres')
			.openapi({ description: 'Nome do usuário', example: 'Ruan Lopes' }),

		email: z
			.string()
			.email('O email deve ser um email válido')
			.openapi({ description: 'Email do usuário', example: 'ruan.lopes@example.com' }),

		password: z
			.string()
			.min(8, 'A senha deve ter no mínimo 8 caracteres')
			.max(255, 'A senha deve ter no máximo 255 caracteres')
			.openapi({ description: 'Senha do usuário', example: 's3cur3P@ssw0rd' }),

		emailVerified: z
			.boolean()
			.optional()
			.openapi({ description: 'Define se o e-mail do usuário foi verificado', example: false }),

		image: z.string().url('A imagem deve ser uma URL válida').nullable().optional().openapi({
			description: 'URL da imagem do usuário',
			example: 'https://example.com/avatar.png',
		}),
	})
	.openapi('UserCreate');

const userUpdateSchema = userCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('UserUpdate');

// Compatibilidade com código já existente
const userSchema = userCreateSchema;

export { userSchema, userUpdateSchema };

// Swagger UI - Documentação da API
export const userRegistry = new OpenAPIRegistry();