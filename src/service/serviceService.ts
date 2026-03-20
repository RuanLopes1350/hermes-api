import ServiceRepository from '../repository/serviceRepository';
import { ServiceSettingsType, ServiceType } from '../types/types';
import {
	serviceCreateSchema,
	serviceSettingsSchema,
	serviceInputSchema,
} from '../utils/validation/serviceValidation';
import { ZodError } from 'zod';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseError } from '../utils/helpers/dbErrors';

class ServiceService {
	private repository: ServiceRepository;

	constructor() {
		this.repository = new ServiceRepository();
	}

	async createService(
		serviceData: Pick<ServiceType, 'name' | 'settings'>,
		loggedUserId: string,
	): Promise<ServiceType> {
		console.log(chalk.blue.bold('[ServiceService] [createService] Validando dados do serviço...'));

		try {
			const parsedInputData = serviceInputSchema.parse(serviceData);

			const parsedServiceData = serviceCreateSchema.parse({
				name: parsedInputData.name,
				settings: parsedInputData.settings,
				creator_id: loggedUserId,
				owner_id: loggedUserId,
			});

			let parsedSettings: ServiceSettingsType | undefined;
			if (parsedServiceData.settings) {
				parsedSettings = serviceSettingsSchema.parse(parsedServiceData.settings);
			}

			const serviceToCreate: ServiceType & { id: string } = {
				id: parsedServiceData.id ?? uuidv4(),
				name: parsedServiceData.name,
				creator_id: parsedServiceData.creator_id,
				owner_id: parsedServiceData.owner_id,
				settings: parsedSettings,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			console.log(
				chalk.blue.bold('[ServiceService] [createService] Criando serviço no repositório...'),
			);
			const createdService = await this.repository.createService(serviceToCreate);
			console.log(chalk.green.bold('[ServiceService] [createService] Serviço criado com sucesso!'));

			return createdService;
		} catch (error) {
			if (error instanceof ZodError || error instanceof DatabaseError) {
				throw error;
			}

			console.error(chalk.red.bold('[ServiceService] [createService] Erro ao criar serviço:'), error);
			throw new Error('Erro ao criar serviço. Por favor, tente novamente.');
		}
	}
}

export default ServiceService;
