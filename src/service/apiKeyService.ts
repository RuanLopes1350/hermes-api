import crypto from 'crypto';
import argon2 from 'argon2';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { v4 as uuidv4 } from 'uuid';
import apiKeyRepository from '../repository/apiKeyRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import { createApiKeySchema, updateApiKeySchema } from '../utils/validation/apiKeyValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para o contexto de API Keys
export class ApiKeyDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'ApiKeyDomainError';
	}
}

class ApiKeyService {
	// Gera uma nova API Key para um serviço do usuário autenticado.
	// A chave completa é retornada UMA ÚNICA VEZ — nunca mais poderá ser recuperada.
	//
	async generateApiKey(data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ApiKeyService] Validando e gerando nova API Key...`,
			),
		);

		const parsedData = createApiKeySchema.parse(data);

		// Garante que o serviço existe e pertence ao usuário
		const serviceExists = await serviceRepository.findByIdAndOwner(parsedData.serviceId, userId);
		if (!serviceExists) {
			throw new ApiKeyDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		// Formato: hm_PREFIXO.SEGREDO_64_CHARS
		const prefix = `hm_${crypto.randomBytes(4).toString('hex')}`;
		const secretKey = crypto.randomBytes(32).toString('hex');
		const fullApiKey = `${prefix}.${secretKey}`;

		console.log(chalk.magenta(`[${getTimestamp()}] [INFO] [ApiKeyService] Gerando Hash Argon2...`));
		const keyHash = await argon2.hash(fullApiKey);

		const savedApiKey = await apiKeyRepository.createApiKey({
			name: parsedData.name,
			keyHash: keyHash,
			prefix: prefix,
			serviceId: parsedData.serviceId,
			expiresAt: parsedData.expires_at ? new Date(parsedData.expires_at) : null,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [ApiKeyService] API Key gerada: ${savedApiKey.id}`,
			),
		);

		// Retorna os dados + o token plano (exibido apenas agora, nunca mais)
		return {
			...savedApiKey,
			token: fullApiKey,
			aviso: 'Guarde este token de acesso. Ele não será exibido novamente.',
		};
	}

	// Lista todas as API Keys ativas de um serviço (sem o hash).
	// Verifica que o serviço pertence ao usuário antes de listar.
	//
	async listApiKeys(serviceId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [ApiKeyService] Listando keys do serviço: ${serviceId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new ApiKeyDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		return apiKeyRepository.findAllByService(serviceId);
	}

	// Busca uma API Key por ID, verificando que o serviço pertence ao usuário.
	//
	async getApiKey(keyId: string, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [ApiKeyService] Buscando key: ${keyId}`),
		);

		const found = await apiKeyRepository.findById(keyId);
		if (!found) {
			throw new ApiKeyDomainError(
				'API Key não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'API_KEY_NOT_FOUND',
			);
		}

		// Valida que o serviço da key pertence ao requester
		const serviceExists = await serviceRepository.findByIdAndOwner(found.service_id, userId);
		if (!serviceExists) {
			throw new ApiKeyDomainError(
				'Você não tem permissão para acessar esta API Key.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		return found;
	}

	// Atualiza nome e/ou status ativo de uma API Key.
	//
	async updateApiKey(keyId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [ApiKeyService] Atualizando key: ${keyId}`),
		);

		// Busca e valida propriedade
		await this.getApiKey(keyId, userId);

		const parsedData = updateApiKeySchema.parse(data);
		const updatePayload = {
			...(parsedData.name !== undefined && { name: parsedData.name }),
			...(parsedData.is_active !== undefined && { is_active: parsedData.is_active }),
			...(parsedData.expires_at !== undefined && {
				expiresAt: parsedData.expires_at ? new Date(parsedData.expires_at) : null,
			}),
		};

		const updated = await apiKeyRepository.updateById(keyId, updatePayload);
		if (!updated) {
			throw new ApiKeyDomainError(
				'API Key não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'API_KEY_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ApiKeyService] Key atualizada: ${keyId}`),
		);
		return updated;
	}

	// Revoga (soft delete) uma API Key.
	//
	async revokeApiKey(keyId: string, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [ApiKeyService] Revogando key: ${keyId}`),
		);

		// Busca e valida propriedade
		await this.getApiKey(keyId, userId);

		const deleted = await apiKeyRepository.softDeleteById(keyId);
		if (!deleted) {
			throw new ApiKeyDomainError(
				'API Key não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'API_KEY_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [ApiKeyService] Key revogada: ${keyId}`),
		);
		return { id: deleted.id };
	}
}

export default new ApiKeyService();
