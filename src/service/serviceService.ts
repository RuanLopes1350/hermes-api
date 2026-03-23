import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import serviceRepository from '../repository/serviceRepository.js';
import { createServiceSchema, updateServiceSchema } from '../utils/validation/serviceValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para o contexto de serviços
export class ServiceDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'ServiceDomainError';
	}
}

class ServiceService {
	// Cria um novo serviço para o usuário autenticado.
	//
	async createService(data: unknown, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Criando serviço...`));
		const parsedData = createServiceSchema.parse(data);

		const newService = await serviceRepository.createService({
			name: parsedData.name,
			settings: parsedData.settings,
			creatorId: userId,
			ownerId: userId,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço criado: ${newService.id}`,
			),
		);
		return newService;
	}

	// Lista todos os serviços ativos do usuário autenticado.
	//
	async listServices(userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Listando serviços do usuário: ${userId}`,
			),
		);
		return serviceRepository.findAllByOwner(userId);
	}

	// Busca um serviço por ID, verificando que pertence ao usuário.
	//
	async getService(serviceId: string, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [ServiceService] Buscando serviço: ${serviceId}`),
		);

		const found = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!found) {
			throw new ServiceDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}
		return found;
	}

	// Atualiza nome e/ou settings de um serviço.
	//
	async updateService(serviceId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Atualizando serviço: ${serviceId}`,
			),
		);

		// Verifica propriedade antes de atualizar
		const existing = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!existing) {
			throw new ServiceDomainError(
				'Serviço não encontrado ou você não tem permissão para alterá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const parsedData = updateServiceSchema.parse(data);
		const updated = await serviceRepository.updateById(serviceId, parsedData);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço atualizado: ${serviceId}`,
			),
		);
		return updated;
	}

	// Soft delete de um serviço (mantém dados para rastreabilidade).
	//
	async deleteService(serviceId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ServiceService] Deletando serviço: ${serviceId}`,
			),
		);

		const existing = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!existing) {
			throw new ServiceDomainError(
				'Serviço não encontrado ou você não tem permissão para removê-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const deleted = await serviceRepository.softDeleteById(serviceId);
		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ServiceService] Serviço soft-deletado: ${serviceId}`,
			),
		);
		return { id: deleted!.id };
	}
}

export default new ServiceService();
