import { Router } from 'express';
import logController from '../controller/logController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Rotas de logs são somente-leitura e exigem sessão (admin verificado no controller)
router.get('/logs', requireAuth, logController.list.bind(logController));
router.get('/logs/:id', requireAuth, logController.getOne.bind(logController));

export default router;
