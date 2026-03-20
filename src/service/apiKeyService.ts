import ApiKeyRepository from '../repository/apiKeyRepository';
import { ApiKeyType } from '../types/types';
import { ZodError } from 'zod';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseError } from '../utils/helpers/dbErrors';
import argon2 from 'argon2';
import generateApiKey from '../utils/apiKeyGenerate';

class ApiKeyService {
	private repository: ApiKeyRepository;

	constructor() {
		this.repository = new ApiKeyRepository();
	}

	async createApiKey(apiKeyData: ApiKeyType): Promise<ApiKeyType> {
		console.log(
			chalk.blue.bold('[ApiKeyService] [createApiKey] Validando dados da chave de API...'),
		);
		try {
			const id = uuidv4();
			const returned = await generateApiKey(apiKeyData.prefix);
			const apiKeyToCreate: ApiKeyType & { id: string; key_hash: string } = {
				id,
				name: apiKeyData.name,
				key_hash: returned.hashedKey,
				prefix: apiKeyData.prefix,
				service_id: apiKeyData.service_id,
				is_active: apiKeyData.is_active,
				last_used_at: apiKeyData.last_used_at ?? undefined,
			};
			const createdApiKey = await this.repository.createApiKey(apiKeyToCreate);
			console.log(
				chalk.green.bold('[ApiKeyService] [createApiKey] Chave de API criada com sucesso!'),
			);
			return {
				...createdApiKey,
				key_hash: returned.key, // Retorna a chave original para o usuário
			};
		} catch (error) {
			if (error instanceof ZodError || error instanceof DatabaseError) {
				throw error;
			}
			console.error(
				chalk.red.bold('[ApiKeyService] [createApiKey] Erro ao criar chave de API:'),
				error,
			);
			throw new Error('Erro ao criar chave de API. Por favor, tente novamente.');
		}
	}
}

export default ApiKeyService;
