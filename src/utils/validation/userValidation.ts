import { z } from 'zod';

// Schema para criação de usuário (registro)
export const createUserSchema = z.object({
	name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
	email: z.string().email('Formato de email inválido.'),
	password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
	image: z.string().url('A imagem deve ser uma URL válida.').optional(),
});

// Schema para atualização de usuário (apenas campos permitidos)
// Email e senha são gerenciados pelo Better Auth — não são atualizáveis por aqui
export const updateUserSchema = z
	.object({
		name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.').optional(),
		image: z.string().url('A imagem deve ser uma URL válida.').nullable().optional(),
	})
	.refine((data) => data.name !== undefined || data.image !== undefined, {
		message: 'Informe ao menos um campo para atualizar: name ou image.',
	});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
