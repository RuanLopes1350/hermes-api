import { Router } from 'express';
import emailController from '../controller/emailController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireApiKey } from '../middlewares/requireApiKey.js';

const router = Router();

// POST — autenticação por API Key (para sistemas externos enviarem e-mails)
router.post(
	'/services/:serviceId/emails',
	requireApiKey,
	emailController.create.bind(emailController),
);

// GET — autenticação por sessão (para o dashboard visualizar os e-mails)
router.get('/services/:serviceId/emails', requireAuth, emailController.list.bind(emailController));
router.get(
	'/services/:serviceId/emails/:id',
	requireAuth,
	emailController.getOne.bind(emailController),
);

// DELETE — autenticação por sessão (cancelar um e-mail pendente)
router.delete(
	'/services/:serviceId/emails/:id',
	requireAuth,
	emailController.cancel.bind(emailController),
);

export default router;
