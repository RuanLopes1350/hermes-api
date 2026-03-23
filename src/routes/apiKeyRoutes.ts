import { Router } from 'express';
import apiKeyController from '../controller/apiKeyController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Todas as rotas de API Keys exigem sessão autenticada
router.post('/keys', requireAuth, apiKeyController.create.bind(apiKeyController));

// GET /keys?serviceId=XXX — lista as keys de um serviço
router.get('/keys', requireAuth, apiKeyController.list.bind(apiKeyController));

router.get('/keys/:id', requireAuth, apiKeyController.getOne.bind(apiKeyController));
router.patch('/keys/:id', requireAuth, apiKeyController.update.bind(apiKeyController));
router.delete('/keys/:id', requireAuth, apiKeyController.revoke.bind(apiKeyController));

export default router;
