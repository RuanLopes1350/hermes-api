import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import userService from '../service/userService';
import CommonResponse from '../utils/helpers/commonResponse';
import HttpStatusCode from '../utils/helpers/httpStatusCode';

class UserController {
	async createUser(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[UserController] Requisição recebida: POST /api/users`));

		try {
			// Pegamos os headers reais para passar ao Better Auth (para segurança e logs de IP)
			const headers = new Headers();
			Object.entries(req.headers).forEach(([key, value]) => {
				if (typeof value === 'string') headers.append(key, value);
			});

			// O Service cuida de toda a validação e criação
			const createdUser = await userService.createUser(req.body, headers);

			// Retornamos a resposta de sucesso usando o helper padrão que você já tinha
			return CommonResponse.created(res, createdUser, 'Usuário criado com sucesso!');
		} catch (error) {
			// Qualquer erro (Zod, UserServiceError, DB) vai cair aqui e ser jogado pro ErrorHandler
			next(error);
		}
	}
}

export default new UserController();
