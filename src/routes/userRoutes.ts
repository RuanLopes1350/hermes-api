import { Router } from 'express';
import userController from '../controller/userController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Rota pública: registro de usuário
router.post('/users', userController.createUser.bind(userController));

// Rotas protegidas por sessão
// GET /users — lista todos (admin only — a verificação acontece no Service)
router.get('/users', requireAuth, userController.listUsers.bind(userController));

// GET /users/:id — busca por ID (admin vê qualquer um; usuário comum, apenas o próprio)
router.get('/users/:id', requireAuth, userController.getUser.bind(userController));

// PATCH /users/:id — atualiza nome/imagem (admin ou próprio)
router.patch('/users/:id', requireAuth, userController.updateUser.bind(userController));

// DELETE /users/:id — deleta (admin only — verificação no Service)
router.delete('/users/:id', requireAuth, userController.deleteUser.bind(userController));

export default router;
