import { Request, Response, NextFunction } from 'express';
import notificationService from '../service/notificationService.js';
import { sendManualNotificationSchema } from '../utils/validation/notificationValidation.js';

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

	async stream(req: Request, res: Response) {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).end();
			return;
		}

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		notificationService.addListener(userId, res);

		const keepAlive = setInterval(() => {
			try {
				res.write(': ping\n\n');
			} catch {
				// Ignora se o socket já fechou
			}
		}, 30000);

		req.on('close', () => {
			clearInterval(keepAlive);
			notificationService.removeListener(userId, res);
			res.end();
		});
	}

	async sendManualNotification(req: Request, res: Response, next: NextFunction) {
		try {
			const userRole = req.user?.role;
			if (userRole !== 'super_admin' && userRole !== 'admin') {
				return res.status(403).json({ error: 'Acesso restrito a administradores.' });
			}

			const parsed = sendManualNotificationSchema.parse(req.body);
			const newNotif = await notificationService.createNotification({
				user_id: parsed.userId || null,
				type: parsed.type,
				title: parsed.title,
				message: parsed.message,
			});

			res.status(201).json({
				message: 'Notificação enviada com sucesso!',
				data: newNotif,
			});
		} catch (error) {
			next(error);
		}
	}
}

export default new NotificationController();
