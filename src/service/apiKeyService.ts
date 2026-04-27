import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import apiKeyRepository from '../repository/apiKeyRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import credentialRepository from '../repository/credentialRepository.js'; // NOVO: Para validar a credencial
import { createApiKeySchema, updateApiKeySchema } from '../utils/validation/apiKeyValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { generateSecureApiKey } from '../utils/apiKeyGenerate.js';

// Erro de domínio para o contexto de API Keys
export class ApiKeyDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'ApiKeyDomainError';
	}
}

class ApiKeyService {
	/**
	 * Gera uma nova API Key vinculada obrigatoriamente a uma credencial.
	 */
	async generateApiKey(data: unknown, userId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [ApiKeyService] Gerando nova API Key vinculada...`));

		const parsedData = createApiKeySchema.parse(data);

		// 1. Valida que o serviço pertence ao usuário
		const serviceExists = await serviceRepository.findByIdAndOwner(parsedData.serviceId, userId);
		if (!serviceExists) {
			throw new ApiKeyDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		}

		// 2. Valida que a credencial existe e pertence ao mesmo serviço
		const cred = await credentialRepository.findById(parsedData.credentialId);
		if (!cred || cred.service_id !== parsedData.serviceId) {
			throw new ApiKeyDomainError('Credencial inválida para este serviço.', 400, 'INVALID_CREDENTIAL');
		}

		const { fullApiKey, keyHash, prefix } = await generateSecureApiKey();

		const savedApiKey = await apiKeyRepository.createApiKey({
			name: parsedData.name,
			keyHash: keyHash,
			prefix: prefix,
			serviceId: parsedData.serviceId,
			credentialId: parsedData.credentialId, // SALVA O VÍNCULO OBRIGATÓRIO
			expiresAt: parsedData.expires_at ? new Date(parsedData.expires_at) : null,
		});

		console.log(chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ApiKeyService] API Key gerada: ${savedApiKey.id}`));

		return {
			...savedApiKey,
			token: fullApiKey,
			aviso: 'Guarde este token. Ele vincula você diretamente à credencial: ' + cred.name,
		};
	}

	async listApiKeys(serviceId: string, userId: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) throw new ApiKeyDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		return apiKeyRepository.findAllByService(serviceId);
	}

    // NOVO: Lista todas as API Keys do usuário
    async listAllUserApiKeys(userId: string) {
        return apiKeyRepository.findAllByUser(userId);
    }

	async getApiKey(keyId: string, userId: string) {
		const found = await apiKeyRepository.findById(keyId);
		if (!found) throw new ApiKeyDomainError('API Key não encontrada.', 404, 'API_KEY_NOT_FOUND');
		const serviceExists = await serviceRepository.findByIdAndOwner(found.service_id, userId);
		if (!serviceExists) throw new ApiKeyDomainError('Acesso negado.', 403, 'FORBIDDEN');
		return found;
	}

	async updateApiKey(keyId: string, data: unknown, userId: string) {
		await this.getApiKey(keyId, userId);
		const parsedData = updateApiKeySchema.parse(data);
		const updatePayload = {
			...(parsedData.name !== undefined && { name: parsedData.name }),
			...(parsedData.is_active !== undefined && { is_active: parsedData.is_active }),
			...(parsedData.expires_at !== undefined && {
				expiresAt: parsedData.expires_at ? new Date(parsedData.expires_at) : null,
			}),
		};
		return await apiKeyRepository.updateById(keyId, updatePayload);
	}

	async revokeApiKey(keyId: string, userId: string) {
		await this.getApiKey(keyId, userId);
		const deleted = await apiKeyRepository.softDeleteById(keyId);
		return { id: deleted.id };
	}
}

export default new ApiKeyService();
