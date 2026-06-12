import { Router } from 'express';
import emailController from '../controller/emailController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireApiKey } from '../middlewares/requireApiKey.js';
import { emailApiRateLimiter } from '../middlewares/rateLimitingMiddleware.js';

const router = Router();

// POST — autenticação por API Key (para sistemas externos enviarem e-mails)
router.post(
	'/emails',
	requireApiKey,
	emailApiRateLimiter,
	emailController.create.bind(emailController),
);

// POST BULK — envio em lote com autenticação por API Key
router.post(
	'/emails/bulk',
	requireApiKey,
	emailApiRateLimiter,
	emailController.createBulk.bind(emailController),
);

// GET — autenticação por sessão (para o dashboard visualizar os e-mails)
router.get('/emails/all', requireAuth, emailController.listAll.bind(emailController));
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
