import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import serviceRepository from '../repository/serviceRepository.js';
import serviceLogRepository from '../repository/serviceLogRepository.js';
import { createServiceSchema, updateServiceSchema, addMemberSchema } from '../utils/validation/serviceValidation.js';
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
	async createService(data: unknown, currentUser: any) {
		const userId = currentUser.id;
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Criando serviço...`));
		const parsedData = createServiceSchema.parse(data);

		const newService = await serviceRepository.createService({
			name: parsedData.name,
			settings: parsedData.settings,
			creatorId: userId,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço criado: ${newService.id}`,
			),
		);

		await serviceLogRepository.insertLog({
			service_id: newService.id,
			actor_id: userId,
			action: 'SERVICE_CREATED',
			description: `Criou o serviço "${newService.name}"`,
		});

		return newService;
	}

	async listServices(currentUser: any) {
		const userId = currentUser.id;
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Listando serviços do usuário: ${userId} (isAdmin: ${currentUser.isAdmin})`,
			),
		);
		if (currentUser.isAdmin) {
			return serviceRepository.findAllForAdmin();
		}
		return serviceRepository.findAllByUser(userId);
	}

	async getService(serviceId: string, currentUser: any) {
		const userId = currentUser.id;
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Buscando serviço: ${serviceId}`),
		);

		const found = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!found && !currentUser.isAdmin) {
			throw new ServiceDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		if (!found && currentUser.isAdmin) {
			// Busca de forma bruta só para o admin
			const rawService = await serviceRepository.findById(serviceId);
			if (!rawService)
				throw new ServiceDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
			return { ...rawService, _role: 'owner' };
		}

		return { ...found!.service, _role: currentUser.isAdmin ? 'owner' : found!.role };
	}

	async updateService(serviceId: string, data: unknown, currentUser: any) {
		const userId = currentUser.id;
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Atualizando serviço: ${serviceId}`,
			),
		);

		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) {
			access = { service: (await serviceRepository.findById(serviceId)) as any, role: 'owner' };
		}

		if (!access || !access.service)
			throw new ServiceDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		if (access.role !== 'owner' && !currentUser.isAdmin) {
			throw new ServiceDomainError(
				'Apenas o dono do serviço pode alterar suas configurações.',
				403,
				'FORBIDDEN',
			);
		}

		const parsedData = updateServiceSchema.parse(data);
		const updated = await serviceRepository.updateById(serviceId, parsedData);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço atualizado: ${serviceId}`,
			),
		);

		await serviceLogRepository.insertLog({
			service_id: serviceId,
			actor_id: userId,
			action: 'SERVICE_UPDATED',
			description: `Atualizou as configurações do serviço`,
		});

		return updated;
	}

	async deleteService(serviceId: string, currentUser: any) {
		const userId = currentUser.id;
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Deletando serviço: ${serviceId}`,
			),
		);

		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) {
			access = { service: (await serviceRepository.findById(serviceId)) as any, role: 'owner' };
		}

		if (!access || !access.service)
			throw new ServiceDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		if (access.role !== 'owner' && !currentUser.isAdmin) {
			throw new ServiceDomainError('Apenas o dono do serviço pode excluí-lo.', 403, 'FORBIDDEN');
		}

		const deleted = await serviceRepository.softDeleteById(serviceId);
		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço soft-deletado: ${serviceId}`,
			),
		);

		await serviceLogRepository.insertLog({
			service_id: serviceId,
			actor_id: userId,
			action: 'SERVICE_DELETED',
			description: `Excluiu o serviço "${access.service.name}"`,
		});

		return { id: deleted!.id };
	}

	// ==================== MEMBER MANAGEMENT ====================

	async listMembers(serviceId: string, currentUser: any) {
		const userId = currentUser.id;
		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) access = { service: {} as any, role: 'owner' };

		if (!access) throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');

		const members = await db
			.select({
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

	async addMember(serviceId: string, data: unknown, currentUser: any) {
		const userId = currentUser.id;
		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) access = { service: {} as any, role: 'owner' };

		if (!access || (access.role !== 'owner' && !currentUser.isAdmin))
			throw new ServiceDomainError(
				'Acesso negado. Apenas o dono pode convidar membros.',
				403,
				'FORBIDDEN',
			);

		// Validar usando Zod
		const parsed = addMemberSchema.parse(data);
		const email = parsed.email;

		const [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
		if (!targetUser)
			throw new ServiceDomainError(
				'Usuário não encontrado com este e-mail no Hermes.',
				404,
				'USER_NOT_FOUND',
			);

		try {
			await db.insert(service_member).values({
				id: uuidv4(),
				service_id: serviceId,
				user_id: targetUser.id,
				role: 'member',
			});

			await serviceLogRepository.insertLog({
				service_id: serviceId,
				actor_id: userId,
				action: 'MEMBER_ADDED',
				description: `Adicionou o usuário ${email} como membro`,
				metadata: { target_user_id: targetUser.id, email },
			});

			return { success: true };
		} catch (e: any) {
			if (e.code === '23505')
				throw new ServiceDomainError('Usuário já é membro deste serviço.', 400, 'ALREADY_MEMBER');
			throw e;
		}
	}

	async removeMember(serviceId: string, targetUserId: string, currentUser: any) {
		const userId = currentUser.id;
		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) access = { service: {} as any, role: 'owner' };

		if (!access || (access.role !== 'owner' && !currentUser.isAdmin))
			throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');
		if (targetUserId === userId)
			throw new ServiceDomainError(
				'Você não pode se remover do projeto como dono.',
				400,
				'BAD_REQUEST',
			);

		await db
			.delete(service_member)
			.where(
				and(eq(service_member.service_id, serviceId), eq(service_member.user_id, targetUserId)),
			);

		await serviceLogRepository.insertLog({
			service_id: serviceId,
			actor_id: userId,
			action: 'MEMBER_REMOVED',
			description: `Removeu um membro do serviço`,
			metadata: { target_user_id: targetUserId },
		});

		return { success: true };
	}

	async transferOwnership(serviceId: string, newOwnerId: string, currentUser: any) {
		const userId = currentUser.id;
		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) access = { service: {} as any, role: 'owner' };

		if (!access || (access.role !== 'owner' && !currentUser.isAdmin))
			throw new ServiceDomainError('Acesso negado.', 403, 'FORBIDDEN');

		const [targetMember] = await db
			.select()
			.from(service_member)
			.where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, newOwnerId)))
			.limit(1);
		if (!targetMember)
			throw new ServiceDomainError(
				'O novo dono precisa ser membro do serviço antes.',
				400,
				'NOT_A_MEMBER',
			);

		await db.transaction(async (tx) => {
			await tx
				.update(service_member)
				.set({ role: 'member' })
				.where(and(eq(service_member.service_id, serviceId), eq(service_member.user_id, userId)));
			await tx
				.update(service_member)
				.set({ role: 'owner' })
				.where(
					and(eq(service_member.service_id, serviceId), eq(service_member.user_id, newOwnerId)),
				);
		});

		await serviceLogRepository.insertLog({
			service_id: serviceId,
			actor_id: userId,
			action: 'OWNERSHIP_TRANSFERRED',
			description: `Transferiu a posse do serviço para o membro ${targetMember.user_id}`,
			metadata: { new_owner_id: newOwnerId },
		});

		return { success: true };
	}

	// ==================== LOGS ====================
	async listLogs(serviceId: string, limit: number, offset: number, currentUser: any) {
		const userId = currentUser.id;
		let access = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!access && currentUser.isAdmin) access = { service: {} as any, role: 'owner' };

		// Somente o dono ou admin podem ver os logs
		if (!access || (access.role !== 'owner' && !currentUser.isAdmin)) {
			throw new ServiceDomainError(
				'Acesso negado. Apenas donos e admins podem visualizar o histórico.',
				403,
				'FORBIDDEN',
			);
		}

		return await serviceLogRepository.findLogsByService(serviceId, limit, offset);
	}
}

export default new ServiceService();
