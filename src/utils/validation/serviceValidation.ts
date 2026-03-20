import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const serviceSettingsSchema = z
	.object({
		rate_limit: z
			.object({
				max_per_minute: z.number().int().positive(),
				max_per_hour: z.number().int().positive(),
				max_per_day: z.number().int().positive(),
			})
			.optional(),
		retry: z.object({
			max_attempts: z.number().int().min(0),
			backoff_strategy: z.enum(['exponential', 'fixed']),
			backoff_delay_seconds: z.number().int().min(0),
		}),
		notifications: z.object({
			alert_on_failure: z.boolean(),
			alert_email: z.string().email('Email de alerta inválido').nullable(),
		}),
		interface: z.object({
			theme: z.enum(['light', 'dark']),
		}),
	})
	.openapi('ServiceSettings');

export const serviceCreateSchema = z
	.object({
		id: z
			.string()
			.uuid()
			.optional()
			.openapi({
				description: 'ID único do serviço',
				example: '123e4567-e89b-12d3-a456-426614174000',
			}),
		name: z
			.string()
			.min(1, 'O nome do serviço é obrigatório')
			.max(255, 'O nome do serviço deve ter no máximo 255 caracteres')
			.openapi({ description: 'Nome do serviço', example: 'Serviço de Email' }),
		creator_id: z
			.string()
			.min(1, 'ID do usuário criador é obrigatório')
			.openapi({
				description: 'ID do usuário criador do serviço',
				example: 'user_abc123',
			}),
		owner_id: z
			.string()
			.min(1, 'ID do usuário proprietário é obrigatório')
			.openapi({
				description: 'ID do usuário proprietário do serviço',
				example: 'user_abc123',
			}),
		settings: z
			.union([serviceSettingsSchema, z.record(z.string(), z.unknown())])
			.optional()
			.openapi({
				description: 'Configurações específicas do serviço',
				example: {
					rate_limit: { max_per_minute: 60, max_per_hour: 1000, max_per_day: 20000 },
					retry: {
						max_attempts: 3,
						backoff_strategy: 'exponential',
						backoff_delay_seconds: 30,
					},
					notifications: {
						alert_on_failure: true,
						alert_email: 'alerts@example.com',
					},
					interface: { theme: 'light' },
				},
			}),
	})
	.openapi('ServiceCreate');

export const serviceInputSchema = z
	.object({
		name: z
			.string()
			.min(1, 'O nome do serviço é obrigatório')
			.max(255, 'O nome do serviço deve ter no máximo 255 caracteres')
			.openapi({ description: 'Nome do serviço', example: 'Serviço de Email' }),
		settings: z
			.union([serviceSettingsSchema, z.record(z.string(), z.unknown())])
			.optional()
			.openapi({
				description: 'Configurações específicas do serviço',
				example: {
					rate_limit: { max_per_minute: 60, max_per_hour: 1000, max_per_day: 20000 },
					retry: {
						max_attempts: 3,
						backoff_strategy: 'exponential',
						backoff_delay_seconds: 30,
					},
					notifications: {
						alert_on_failure: true,
						alert_email: 'alerts@example.com',
					},
					interface: { theme: 'light' },
				},
			}),
	})
	.openapi('ServiceInput');

export const serviceUpdateSchema = serviceCreateSchema
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualização',
	})
	.openapi('ServiceUpdate');

// Compatibilidade com código já existente
export const serviceSchema = serviceCreateSchema;
