import { z } from 'zod';

// Esquema de validação para a criação de um usuário
export const createUserSchema = z.object({
	name: z.string('O nome é obrigatório.').min(3, 'O nome deve ter no mínimo 3 caracteres.'),
	email: z.string('O email é obrigatório.').email('Formato de email inválido.'),
	password: z.string('A senha é obrigatória.').min(8, 'A senha deve ter no mínimo 8 caracteres.'),
	image: z.string('A imagem deve ser uma URL válida.').url().optional(),
});

// Inferindo o tipo TypeScript a partir do esquema do Zod
export type CreateUserInput = z.infer<typeof createUserSchema>;
