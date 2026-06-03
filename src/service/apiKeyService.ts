import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import apiKeyRepository from '../repository/apiKeyRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import credentialRepository from '../repository/credentialRepository.js'; 
import { createApiKeySchema, updateApiKeySchema } from '../utils/validation/apiKeyValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { generateSecureApiKey } from '../utils/apiKeyGenerate.js';
import { dispatchWebhook } from '../utils/webhookDispatcher.js';

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
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ApiKeyService] Gerando nova API Key vinculada...`,
			),
		);

		const parsedData = createApiKeySchema.parse(data);

		// 1. Valida que o serviço pertence ao usuário
		const serviceExists = await serviceRepository.findByIdAndOwner(parsedData.serviceId, userId);
		if (!serviceExists) {
			throw new ApiKeyDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		}

		// 2. Valida que a credencial existe e pertence ao mesmo serviço
		const cred = await credentialRepository.findById(parsedData.credentialId);
		if (!cred || cred.service_id !== parsedData.serviceId) {
			throw new ApiKeyDomainError(
				'Credencial inválida para este serviço.',
				400,
				'INVALID_CREDENTIAL',
			);
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

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ApiKeyService] API Key gerada: ${savedApiKey.id}`,
			),
		);

		return {
			...savedApiKey,
			token: fullApiKey,
			aviso: 'Guarde este token. Ele vincula você diretamente à credencial: ' + cred.name,
		};
	}

	async listApiKeys(serviceId: string, userId: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists)
			throw new ApiKeyDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
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

	async rotateApiKey(keyId: string, userId: string) {
		// 1. Pega a chave antiga e garante que o usuário é dono do serviço
		const oldKey = await this.getApiKey(keyId, userId);
		const serviceData = await serviceRepository.findById(oldKey.service_id);
		
		if (!serviceData) {
			throw new ApiKeyDomainError('Serviço não encontrado.', 404, 'SERVICE_NOT_FOUND');
		}

		// 2. Gera a nova chave copiando os dados da antiga
		const { fullApiKey, keyHash, prefix } = await generateSecureApiKey();
		
		const settings = serviceData.settings as any;
		const rotationIntervalDays = settings?.security?.rotation_interval_days || null;
		let newExpiresAt = null;
		if (rotationIntervalDays) {
			newExpiresAt = new Date();
			newExpiresAt.setDate(newExpiresAt.getDate() + rotationIntervalDays);
		}

		const newApiKey = await apiKeyRepository.createApiKey({
			name: `${oldKey.name} (Rotacionada)`,
			keyHash: keyHash,
			prefix: prefix,
			serviceId: oldKey.service_id,
			credentialId: oldKey.credential_id, 
			expiresAt: newExpiresAt,
		});

		// 3. Define Grace Period de 48h na chave antiga
		const gracePeriodEndsAt = new Date();
		gracePeriodEndsAt.setHours(gracePeriodEndsAt.getHours() + 48);
		
		await apiKeyRepository.updateById(keyId, {
			expiresAt: gracePeriodEndsAt
		});

		// 4. Se tiver webhook configurado, dispara
		const webhookUrl = settings?.notifications?.webhook_url;
		const webhookSecret = settings?.notifications?.webhook_secret;

		if (webhookUrl && webhookSecret) {
			try {
				await dispatchWebhook(webhookUrl, webhookSecret, {
					event: "api_key.rotated",
					serviceId: oldKey.service_id,
					oldKeyId: keyId,
					newApiKey: fullApiKey,
					gracePeriodEndsAt: gracePeriodEndsAt.toISOString()
				});
			} catch (e: any) {
				console.error(chalk.yellow(`[ApiKeyService] Aviso: Webhook de rotação falhou, mas a chave foi rotacionada.`));
			}
		}

		return {
			...newApiKey,
			token: fullApiKey,
			aviso: 'Chave rotacionada. A chave antiga expirará em 48 horas.'
		};
	}
}

export default new ApiKeyService();
