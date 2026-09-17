import { z } from 'zod';

export const sendManualNotificationSchema = z.object({
	userId: z.string().optional().nullable(),
	type: z.enum(
		['error', 'warning', 'info', 'success'],
		"O tipo dever 'error', 'warning', 'info', 'success'.",
	),
	title: z
		.string()
		.min(2, 'O título deve ter no mínimo 2 caracteres.')
		.max(120, 'O título não pode exceder 120 caracteres.'),
	message: z
		.string()
		.min(2, 'A mensagem deve ter no mínimo 2 caracteres.')
		.max(1000, 'a mensagem não pode exceder 1000 caracteres.'),
});

export type SendManualNotificationInput = z.infer<typeof sendManualNotificationSchema>;
