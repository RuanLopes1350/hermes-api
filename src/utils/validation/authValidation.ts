import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const signUpSchema = z
	.object({
		name: z.string().min(1, 'O nome é obrigatório').max(255, 'O nome deve ter no máximo 255 caracteres'),
		email: z.string().email('O email deve ser válido'),
		password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(255),
		image: z.string().url('A imagem deve ser uma URL válida').nullable().optional(),
	})
	.openapi('AuthSignUp');

export const signInSchema = z
	.object({
		email: z.string().email('O email deve ser válido'),
		password: z.string().min(1, 'A senha é obrigatória'),
	})
	.openapi('AuthSignIn');

export const forgotPasswordSchema = z
	.object({
		email: z.string().email('O email deve ser válido'),
	})
	.openapi('AuthForgotPassword');

export const resetPasswordSchema = z
	.object({
		token: z.string().min(1, 'O token é obrigatório'),
		newPassword: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres').max(255),
	})
	.openapi('AuthResetPassword');

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
		newPassword: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres').max(255),
	})
	.openapi('AuthChangePassword');
