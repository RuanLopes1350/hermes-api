import { Router } from 'express';
import notificationController from '../controller/notificationController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.get('/my-alerts', requireAuth, notificationController.getMyUnread.bind(notificationController));
router.get('/admin', requireAuth, notificationController.getAllAdmin.bind(notificationController));

router.patch('/:id/read', requireAuth, notificationController.markAsRead.bind(notificationController));
router.post('/read-all', requireAuth, notificationController.markAllAsRead.bind(notificationController));

export default router;
