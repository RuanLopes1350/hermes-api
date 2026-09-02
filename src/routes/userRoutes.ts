import { Router } from 'express';
import userController from '../controller/userController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authApiRateLimiter } from '../middlewares/rateLimitingMiddleware.js';

const router = Router();

// Rota pública: registro de usuário
router.post('/users', authApiRateLimiter, userController.createUser.bind(userController));

// Rotas protegidas por sessão
// GET /users — lista todos (admin only — a verificação acontece no Service)
router.get('/users', requireAuth, userController.listUsers.bind(userController));

// GET /users/session-events — SSE de invalidação de sessão (precisa vir antes de /users/:id)
router.get('/users/session-events', requireAuth, userController.sessionEvents.bind(userController));

// GET /users/online — snapshot de quem está online (precisa vir antes de /users/:id)
router.get('/users/online', requireAuth, userController.listOnlineUsers.bind(userController));

// GET /users/presence-stream — SSE de mudanças de presença (idem, antes de /users/:id)
router.get(
	'/users/presence-stream',
	requireAuth,
	userController.presenceStream.bind(userController),
);

// GET /users/:id — busca por ID (admin vê qualquer um; usuário comum, apenas o próprio)
router.get('/users/:id', requireAuth, userController.getUser.bind(userController));

// PATCH /users/:id — atualiza nome/imagem (admin ou próprio)
router.patch('/users/:id', requireAuth, userController.updateUser.bind(userController));

// PATCH /users/:id/admin — atualiza isAdmin/isActive (admin only)
router.patch('/users/:id/admin', requireAuth, userController.adminUpdateUser.bind(userController));

// DELETE /users/:id — deleta (admin only — verificação no Service)
router.delete('/users/:id', requireAuth, userController.deleteUser.bind(userController));

// GET /users/:id/sessions — lista as sessões ativas (admin ou o próprio usuário)
router.get('/users/:id/sessions', requireAuth, userController.listSessions.bind(userController));

// DELETE /users/:id/sessions/:token — revoga uma sessão específica (admin ou próprio)
router.delete('/users/:id/sessions/:token', requireAuth, userController.revokeSession.bind(userController));

export default router;
