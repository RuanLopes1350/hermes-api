import { db } from '../config/dbConfig';
import { parseDatabaseError } from '../utils/helpers/dbErrors';
import chalk from 'chalk';
import { service } from '../config/db/schema';
import { ServiceType, ServiceSettingsType } from '../types/types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class ServiceRepository {
	private db: typeof db;

	constructor() {
		this.db = db;
	}

	async createService(serviceData: ServiceType & { id: string }): Promise<ServiceType> {
		console.log(
			chalk.blue.bold(
				'[ServiceRepository] [createService] Gravando novo serviço no banco de dados...',
			),
		);

		try {
			const createdService = await this.db
				.insert(service)
				.values({
					id: serviceData.id,
					name: serviceData.name,
					creator_id: serviceData.creator_id,
					owner_id: serviceData.owner_id,
					settings: serviceData.settings,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			const insertedService = createdService[0];

			console.log(
				chalk.green.bold('[ServiceRepository] [createService] Serviço criado com sucesso!'),
			);

			return {
				...insertedService,
				settings: insertedService.settings as ServiceSettingsType,
				createdAt: insertedService.createdAt ?? undefined,
				updatedAt: insertedService.updatedAt ?? undefined,
			};
		} catch (error) {
			const parsedError = parseDatabaseError(error, 'Erro ao criar serviço');
			console.error(
				chalk.red.bold('[ServiceRepository] [createService] Erro ao criar serviço:'),
				parsedError,
			);
			throw parsedError;
		}
	}
}

export default ServiceRepository;
