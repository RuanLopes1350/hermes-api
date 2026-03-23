import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import userService from '../service/userService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class UserController {
	// POST /api/users
	// Cria um novo usuário (registro público).

	async createUser(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/users`));
		try {
			const headers = new Headers();
			Object.entries(req.headers).forEach(([key, value]) => {
				if (typeof value === 'string') headers.append(key, value);
			});

			const createdUser = await userService.createUser(req.body, headers);
			return CommonResponse.created(res, createdUser, 'Usuário criado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/users
	// Lista todos os usuários. Restrito a administradores.

	async listUsers(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/users`));
		try {
			const users = await userService.listUsers();
			return CommonResponse.success(res, users, 200, `${users.length} usuário(s) encontrado(s).`);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/users/:id
	// Busca um usuário por ID. Admin pode ver qualquer um; usuário comum, apenas o próprio.

	async getUser(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/users/${id}`));
		try {
			const requesterId = req.user!.id;
			const requesterIsAdmin = req.user!.isAdmin ?? false;

			const found = await userService.getUser(id, requesterId, requesterIsAdmin);
			return CommonResponse.success(res, found, 200, 'Usuário encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/users/:id
	// Atualiza nome e/ou imagem. Admin pode atualizar qualquer um; usuário comum, apenas o próprio.

	async updateUser(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [PATCH] /api/users/${id}`));
		try {
			const requesterId = req.user!.id;
			const requesterIsAdmin = req.user!.isAdmin ?? false;

			const updated = await userService.updateUser(id, req.body, requesterId, requesterIsAdmin);
			return CommonResponse.success(res, updated, 200, 'Usuário atualizado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/users/:id
	// Deleta um usuário permanentemente. Restrito a administradores.

	async deleteUser(req: Request, res: Response, next: NextFunction) {
		const id = String(req.params.id);
		console.log(chalk.cyan(`[${getTimestamp()}] [DELETE] /api/users/${id}`));
		try {
			const result = await userService.deleteUser(id);
			return CommonResponse.success(res, result, 200, 'Usuário deletado com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new UserController();
