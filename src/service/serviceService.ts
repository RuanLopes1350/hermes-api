import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import serviceRepository from '../repository/serviceRepository.js';
import { createServiceSchema, updateServiceSchema } from '../utils/validation/serviceValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { db } from '../config/dbConfig.js';
import { service_member, user } from '../config/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class ServiceDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'ServiceDomainError';
	}
}

class ServiceService {
	async createService(data: unknown, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Criando serviço...`));
		const parsedData = createServiceSchema.parse(data);

		const newService = await serviceRepository.createService({
			name: parsedData.name,
			settings: parsedData.settings,
			creatorId: userId,
		});

		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço criado: ${newService.id}`));
		return newService;
	}

	async listServices(userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Listando serviços do usuário: ${userId}`));
		return serviceRepository.findAllByUser(userId);
	}

	async getService(serviceId: string, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Buscando serviço: ${serviceId}`));

		const found = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!found) {
			throw new ServiceDomainError('Serviço não encontrado ou você não tem permissão para acessá-lo.', HttpStatusCode.NOT_FOUND.code, 'SERVICE_NOT_FOUND');
		}
		return { ...found.service, _role: found.role };
	}

	async updateService(serviceId: string, data: unknown, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Atualizando serviço: ${serviceId}`));

		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access) throw new ServiceDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		if (access.role !== 'owner') {
			throw new ServiceDomainError('Apenas o dono do serviço pode alterar suas configurações.', 403, 'FORBIDDEN');
		}

		const parsedData = updateServiceSchema.parse(data);
		const updated = await serviceRepository.updateById(serviceId, parsedData);

		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço atualizado: ${serviceId}`));
		return updated;
	}

	async deleteService(serviceId: string, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Deletando serviço: ${serviceId}`));

		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access) throw new ServiceDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		if (access.role !== 'owner') {
			throw new ServiceDomainError('Apenas o dono do serviço pode excluí-lo.', 403, 'FORBIDDEN');
		}

		const deleted = await serviceRepository.softDeleteById(serviceId);
		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço soft-deletado: ${serviceId}`));
		return { id: deleted!.id };
	}

	// ==================== MEMBER MANAGEMENT ====================

	async listMembers(serviceId: string, userId: string) {
		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access) throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');

		const members = await db.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: service_member.role,
		})
		.from(service_member)
		.innerJoin(user, eq(service_member.user_id, user.id))
		.where(eq(service_member.service_id, serviceId));

		return members;
	}

	async addMember(serviceId: string, email: string, userId: string) {
		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access || access.role !== 'owner') throw new ServiceDomainError('Acesso negado. Apenas o dono pode convidar membros.', 403, 'FORBIDDEN');

		const [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
		if (!targetUser) throw new ServiceDomainError('Usuário não encontrado com este e-mail no Hermes.', 404, 'USER_NOT_FOUND');

		try {
			await db.insert(service_member).values({
				id: uuidv4(),
				service_id: serviceId,
				user_id: targetUser.id,
				role: 'member',
			});
			return { success: true };
		} catch (e: any) {
			if (e.code === '23505') throw new ServiceDomainError('Usuário já é membro deste serviço.', 400, 'ALREADY_MEMBER');
			throw e;
		}
	}

	async removeMember(serviceId: string, targetUserId: string, userId: string) {
		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access || access.role !== 'owner') throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');
		if (targetUserId === userId) throw new ServiceDomainError('Você não pode se remover do projeto como dono.', 400, 'BAD_REQUEST');

		await db.delete(service_member).where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, targetUserId)));
		return { success: true };
	}

	async transferOwnership(serviceId: string, newOwnerId: string, userId: string) {
		const access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access || access.role !== 'owner') throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');

		const [targetMember] = await db.select().from(service_member).where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, newOwnerId))).limit(1);
		if (!targetMember) throw new ServiceDomainError('O novo dono precisa ser membro do serviço antes.', 400, 'NOT_A_MEMBER');

		await db.transaction(async (tx) => {
			await tx.update(service_member).set({ role: 'member' }).where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, userId)));
			await tx.update(service_member).set({ role: 'owner' }).where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, newOwnerId)));
		});
		return { success: true };
	}
}

export default new ServiceService();
