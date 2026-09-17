import { Router } from 'express';
import notificationController from '../controller/notificationController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import notificationService from '../service/notificationService.js';

const router = Router();

// SSE: stream de notificações em tempo real
router.get('/stream', requireAuth, notificationController.stream.bind(notificationController));

router.get(
	'/my-alerts',
	requireAuth,
	notificationController.getMyUnread.bind(notificationController),
);
router.get('/admin', requireAuth, notificationController.getAllAdmin.bind(notificationController));

router.patch(
	'/:id/read',
	requireAuth,
	notificationController.markAsRead.bind(notificationController),
);
router.post(
	'/read-all',
	requireAuth,
	notificationController.markAllAsRead.bind(notificationController),
);

router.post(
	'/send',
	requireAuth,
	notificationController.sendManualNotification.bind(notificationController),
);

export default router;
