import { Request, Response, NextFunction } from 'express';
import notificationService from '../service/notificationService.js';

class NotificationController {
	async getMyUnread(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				return res.status(401).json({ error: 'Não autenticado' });
			}

			const notifications = await notificationService.getUnreadForUser(userId);
			res.status(200).json(notifications);
		} catch (error) {
			next(error);
		}
	}

	async getAllAdmin(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				return res.status(401).json({ error: 'Não autenticado' });
			}

			const limit = parseInt(req.query.limit as string) || 50;
			const offset = parseInt(req.query.offset as string) || 0;

			const notifications = await notificationService.getAllForAdmin(userId, limit, offset);
			res.status(200).json(notifications);
		} catch (error) {
			next(error);
		}
	}

	async markAsRead(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			const id = req.params.id as string;

			if (!userId) {
				return res.status(401).json({ error: 'Não autenticado' });
			}

			const updated = await notificationService.markAsRead(id, userId);
			res.status(200).json(updated);
		} catch (error) {
			next(error);
		}
	}

	async markAllAsRead(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;

			if (!userId) {
				return res.status(401).json({ error: 'Não autenticado' });
			}

			const result = await notificationService.markAllAsRead(userId);
			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}
}

export default new NotificationController();
