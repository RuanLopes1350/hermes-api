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
	async createNotification(data: InsertNotificationData) {
		return notificationRepository.insert(data);
	}

	async getUnreadForUser(userId: string) {
		const user = await userRepository.findById(userId);
		if (!user) throw new NotificationDomainError('Usuário não encontrado', 404, 'NOT_FOUND');

		// Busca os serviços aos quais o usuário tem acesso
		const userServices = await serviceRepository.findAllByUser(userId);
		const serviceIds = userServices.map((s) => s.id);

		return notificationRepository.findUnreadForUser(userId, serviceIds);
	}

	async getAllForAdmin(userId: string, limit: number = 50, offset: number = 0) {
		const user = await userRepository.findById(userId);
		if (!user || !user.isAdmin) {
			throw new NotificationDomainError('Acesso negado. Apenas administradores.', 403, 'FORBIDDEN');
		}

		return notificationRepository.findAllAdmin(limit, offset);
	}

	async markAsRead(notificationId: string, userId: string) {
		const user = await userRepository.findById(userId);
		if (!user) throw new NotificationDomainError('Usuário não encontrado', 404, 'NOT_FOUND');

		// Podemos adicionar verificação de segurança se o usuário é dono da notificação
		// ou se ele tem acesso ao serviço dessa notificação.
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
