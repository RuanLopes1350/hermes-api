import { Router } from 'express';
import settingsController from '../controller/settingsController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireSuperAdmin } from '../middlewares/requireSuperAdmin.js';

const router = Router();

// Callback público do Google OAuth para o e-mail do sistema
router.get(
	'/callback/google/system',
	settingsController.handleGoogleCallback.bind(settingsController),
);

// Rotas protegidas (super_admin apenas)
router.get(
	'/settings',
	requireAuth,
	requireSuperAdmin,
	settingsController.getSettings.bind(settingsController),
);
router.put(
	'/settings/mail',
	requireAuth,
	requireSuperAdmin,
	settingsController.updateMailConfig.bind(settingsController),
);
router.post(
	'/settings/mail/test',
	requireAuth,
	requireSuperAdmin,
	settingsController.sendTestEmail.bind(settingsController),
);
router.get(
	'/settings/mail/google-auth-url',
	requireAuth,
	requireSuperAdmin,
	settingsController.getGoogleAuthUrl.bind(settingsController),
);
router.put(
	'/settings/security',
	requireAuth,
	requireSuperAdmin,
	settingsController.updateSecurityConfig.bind(settingsController),
);

export default router;
