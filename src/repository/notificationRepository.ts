import { db } from '../config/dbConfig.js';
import { desc, eq, and, or, inArray, isNull } from 'drizzle-orm';
import { notification, user } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

export interface InsertNotificationData {
	service_id?: string | null;
	user_id?: string | null;
	type: 'error' | 'warning' | 'info' | 'success';
	title: string;
	message: string;
}

class NotificationRepository {
	async insert(data: InsertNotificationData) {
		try {
			const [newNotif] = await db
				.insert(notification)
				.values({
					id: uuidv4(),
					service_id: data.service_id || null,
					user_id: data.user_id || null,
					type: data.type,
					title: data.title,
					message: data.message,
				})
				.returning();
			return newNotif;
		} catch (error) {
			console.error(chalk.red(`[Erro ao inserir notificação]: ${error}`));
			throw parseDatabaseError(error, 'NotificationRepository.insert');
		}
	}

	async findUnreadForUser(userId: string, serviceIds: string[]) {
		try {
			const condition =
				serviceIds.length > 0
					? and(
							eq(notification.is_read, false),
							or(
								eq(notification.user_id, userId),
								isNull(notification.user_id), // Notificações globais (broadcast)
								inArray(notification.service_id, serviceIds),
							),
						)
					: and(
							eq(notification.is_read, false),
							or(
								eq(notification.user_id, userId),
								isNull(notification.user_id), // Notificações globais (broadcast)
							),
						);

			return await db
				.select()
				.from(notification)
				.where(condition)
				.orderBy(desc(notification.createdAt))
				.limit(20);
		} catch (error) {
			throw parseDatabaseError(error, 'NotificationRepository.findUnreadForUser');
		}
	}

	async findAllAdmin(limit: number = 50, offset: number = 0) {
		try {
			return await db
				.select({
					id: notification.id,
					service_id: notification.service_id,
					user_id: notification.user_id,
					type: notification.type,
					title: notification.title,
					message: notification.message,
					is_read: notification.is_read,
					createdAt: notification.createdAt,
					// Dados do destinatário (se for direcionado)
					targetUserName: user.name,
					targetUserEmail: user.email,
				})
				.from(notification)
				.leftJoin(user, eq(notification.user_id, user.id))
				.orderBy(desc(notification.createdAt))
				.limit(limit)
				.offset(offset);
		} catch (error) {
			throw parseDatabaseError(error, 'NotificationRepository.findAllAdmin');
		}
	}

	async markAsRead(notificationId: string) {
		try {
			const [updated] = await db
				.update(notification)
				.set({ is_read: true })
				.where(eq(notification.id, notificationId))
				.returning();
			return updated;
		} catch (error) {
			throw parseDatabaseError(error, 'NotificationRepository.markAsRead');
		}
	}

	async markAllAsReadForUser(userId: string, serviceIds: string[]) {
		try {
			const condition =
				serviceIds.length > 0
					? and(
							eq(notification.is_read, false),
							or(eq(notification.user_id, userId), inArray(notification.service_id, serviceIds)),
						)
					: and(eq(notification.is_read, false), eq(notification.user_id, userId));

			await db.update(notification).set({ is_read: true }).where(condition);
		} catch (error) {
			throw parseDatabaseError(error, 'NotificationRepository.markAllAsReadForUser');
		}
	}
}

export default new NotificationRepository();
