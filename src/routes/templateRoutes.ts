import { Router } from 'express';
import templateController from '../controller/templateController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Rota de Preview (MJML -> HTML em tempo real)
router.post(
	'/services/:serviceId/templates/preview',
	requireAuth,
	templateController.preview.bind(templateController),
);

router.post(
	'/services/:serviceId/templates',
	requireAuth,
	templateController.create.bind(templateController),
);

router.get(
	'/services/:serviceId/templates',
	requireAuth,
	templateController.list.bind(templateController),
);

router.get(
	'/services/:serviceId/templates/:id',
	requireAuth,
	templateController.getOne.bind(templateController),
);

router.patch(
	'/services/:serviceId/templates/:id',
	requireAuth,
	templateController.update.bind(templateController),
);

router.delete(
	'/services/:serviceId/templates/:id',
	requireAuth,
	templateController.remove.bind(templateController),
);

export default router;
