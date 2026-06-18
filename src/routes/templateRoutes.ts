import { Router } from 'express';
import templateController from '../controller/templateController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { templateApiRateLimiter } from '../middlewares/rateLimitingMiddleware.js';

const router = Router();

// Rotas Globais (Gerenciamento simplificado)
router.get(
	'/templates',
	requireAuth,
	templateApiRateLimiter,
	templateController.listAll.bind(templateController),
);

router.get(
	'/templates/:id',
	requireAuth,
	templateApiRateLimiter,
	templateController.getOneGlobal.bind(templateController),
);

router.get(
	'/templates/:id/logs',
	requireAuth,
	templateApiRateLimiter,
	templateController.getLogs.bind(templateController),
);

router.post(
	'/templates',
	requireAuth,
	templateApiRateLimiter,
	templateController.create.bind(templateController),
);

router.patch(
	'/templates/:id',
	requireAuth,
	templateApiRateLimiter,
	templateController.update.bind(templateController),
);

router.delete(
	'/templates/:id',
	requireAuth,
	templateApiRateLimiter,
	templateController.remove.bind(templateController),
);

// Rota de Preview Global
router.post(
	'/templates/preview',
	requireAuth,
	templateApiRateLimiter,
	templateController.preview.bind(templateController),
);

// Rotas vinculadas a serviços (Retrocompatibilidade e Contexto)
router.post(
	'/services/:serviceId/templates/preview',
	requireAuth,
	templateApiRateLimiter,
	templateController.preview.bind(templateController),
);

router.get(
	'/services/:serviceId/templates',
	requireAuth,
	templateController.list.bind(templateController),
);

router.post(
	'/services/:serviceId/templates',
	requireAuth,
	templateController.create.bind(templateController),
);

export default router;
