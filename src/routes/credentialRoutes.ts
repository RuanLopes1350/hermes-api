import { Router } from 'express';
import credentialController from '../controller/credentialController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Todas as rotas de credenciais exigem sessão autenticada
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

export default router;
