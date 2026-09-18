import { Response } from 'express';
import notificationRepository, {
	InsertNotificationData,
} from '../repository/notificationRepository.js';
import { DomainError } from '../utils/helpers/domainError.js';
import userRepository from '../repository/userRepository.js';
import serviceRepository from '../repository/serviceRepository.js';

export class NotificationDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'NotificationDomainError';
	}
}

class NotificationService {
	// userId -> Set de conexões SSE abertas para aquele usuário.
	// Segue o mesmo padrão de PresenceService.online: in-memory, reconstrói na reconexão automática do EventSource do cliente.
	private listeners = new Map<string, Set<Response>>();

	// Registra uma conexão SSE de um usuário autenticado
	addListener(userId: string, res: Response) {
		if (!this.listeners.has(userId)) this.listeners.set(userId, new Set());
		this.listeners.get(userId)!.add(res);
	}

	// Remove uma conexão SSE quando o socket fecha
	removeListener(userId: string, res: Response) {
		const conns = this.listeners.get(userId);
		if (!conns) return;
		conns.delete(res);
		if (conns.size === 0) this.listeners.delete(userId);
	}

	// Envia um evento SSE para um usuário específico (todas as abas dele)
	private sendToUser(userId: string, event: object) {
		const conns = this.listeners.get(userId);
		if (!conns || conns.size === 0) return;
		const payload = `data: ${JSON.stringify(event)}\n\n`;
		for (const client of conns) {
			try {
				client.write(payload);
			} catch {
				// Cliente desconectado; será removido pelo req.on('close')
			}
		}
	}

	// Envia um evento SSE para TODOS os listeners conectados (ex: admins na página de alertas)
	private broadcastAll(event: object) {
		const payload = `data: ${JSON.stringify(event)}\n\n`;
		for (const [, conns] of this.listeners) {
			for (const client of conns) {
				try {
					client.write(payload);
				} catch {}
			}
		}
	}

	async createNotification(data: InsertNotificationData) {
		const newNotif = await notificationRepository.insert(data);

		// Broadcast em tempo real
		const event = { type: 'new_notification', notification: newNotif };

		if (data.user_id) {
			// Notificação direcionada a um usuário específico
			this.sendToUser(data.user_id, event);
		}

		if (data.service_id) {
			// Notificação de um serviço: busca os membros via serviceRepository
			try {
				const members = await serviceRepository.findMembers(data.service_id);
				for (const m of members) {
					this.sendToUser(m.userId, event);
				}
			} catch (err) {
				console.error('[NotificationService] Erro ao buscar membros do serviço para SSE:', err);
			}
		}

		// Sempre notifica admins conectados que não foram cobertos acima
		// (eles podem não ser membros do serviço mas veem alertas globais)
		this.broadcastAll(event);

		return newNotif;
	}

	async getUnreadForUser(userId: string) {
		const user = await userRepository.findById(userId);
		if (!user) throw new NotificationDomainError('Usuário não encontrado', 404, 'NOT_FOUND');

		// Busca os serviços aos quais o usuário tem acesso via serviceRepository
		const userServices = await serviceRepository.findAllByUser(userId);
		const serviceIds = userServices.map((s) => s.id);

		return notificationRepository.findUnreadForUser(userId, serviceIds);
	}

	async getAllForAdmin(userId: string, limit: number = 50, offset: number = 0) {
		const user = await userRepository.findById(userId);
		if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
			throw new NotificationDomainError('Acesso negado. Apenas administradores.', 403, 'FORBIDDEN');
		}

		return notificationRepository.findAllAdmin(limit, offset);
	}

	async markAsRead(notificationId: string, userId: string) {
		const user = await userRepository.findById(userId);
		if (!user) throw new NotificationDomainError('Usuário não encontrado', 404, 'NOT_FOUND');

		return notificationRepository.markAsRead(notificationId);
	}

	async markAllAsRead(userId: string) {
		const user = await userRepository.findById(userId);
		if (!user) throw new NotificationDomainError('Usuário não encontrado', 404, 'NOT_FOUND');

		const userServices = await serviceRepository.findAllByUser(userId);
		const serviceIds = userServices.map((s) => s.id);

		await notificationRepository.markAllAsReadForUser(userId, serviceIds);
		return { success: true };
	}
}

export default new NotificationService();
