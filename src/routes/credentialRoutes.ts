import { Router } from 'express';
import credentialController from '../controller/credentialController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// --- Rotas de Gerenciamento de Credenciais ---

// Listagem global do usuário
router.get('/credentials', requireAuth, credentialController.listGlobal.bind(credentialController));

router.post(
	'/services/:serviceId/credentials',
	requireAuth,
	credentialController.create.bind(credentialController),
);
router.get(
	'/services/:serviceId/credentials',
	requireAuth,
	credentialController.list.bind(credentialController),
);
router.get(
	'/services/:serviceId/credentials/:id',
	requireAuth,
	credentialController.getOne.bind(credentialController),
);
router.patch(
	'/services/:serviceId/credentials/:id',
	requireAuth,
	credentialController.update.bind(credentialController),
);
router.delete(
	'/services/:serviceId/credentials/:id',
	requireAuth,
	credentialController.remove.bind(credentialController),
);

// --- Rotas Específicas para Google OAuth2 ---

router.get(
	'/services/:serviceId/credentials/:id/authorize',
	requireAuth,
	credentialController.authorizeGoogle.bind(credentialController),
);

router.get(
	'/auth/google/callback',
	credentialController.callbackGoogle.bind(credentialController),
);

export default router;
