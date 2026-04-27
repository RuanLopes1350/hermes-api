import { Router } from 'express';
import apiKeyController from '../controller/apiKeyController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Listagem global do usuário
router.get('/api-keys', requireAuth, apiKeyController.listGlobal.bind(apiKeyController));

// Padronizando para seguir a hierarquia de serviços
router.post(
	'/services/:serviceId/api-keys',
	requireAuth,
	apiKeyController.create.bind(apiKeyController),
);

router.get(
	'/services/:serviceId/api-keys',
	requireAuth,
	apiKeyController.list.bind(apiKeyController),
);

router.get(
	'/services/:serviceId/api-keys/:id',
	requireAuth,
	apiKeyController.getOne.bind(apiKeyController),
);

router.patch(
	'/services/:serviceId/api-keys/:id',
	requireAuth,
	apiKeyController.update.bind(apiKeyController),
);

router.delete(
	'/services/:serviceId/api-keys/:id',
	requireAuth,
	apiKeyController.revoke.bind(apiKeyController),
);

// Mantendo compatibilidade temporária
router.get('/keys', requireAuth, apiKeyController.list.bind(apiKeyController));

export default router;
