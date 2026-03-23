import crypto from 'crypto';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import credentialRepository from '../repository/credentialRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import {
	createCredentialSchema,
	updateCredentialSchema,
} from '../utils/validation/credentialValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para credenciais
export class CredentialDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'CredentialDomainError';
	}
}

// ============================================================
// Criptografia AES-256-GCM
// A MASTER_KEY deve ser uma string de 64 caracteres hex (32 bytes).
// Cada criptografia usa um IV aleatório de 12 bytes, garantindo que
// o mesmo texto nunca gere o mesmo ciphertext.
// O formato armazenado é: IV_HEX:AUTH_TAG_HEX:CIPHERTEXT_HEX
// ============================================================

function getMasterKey(): Buffer {
	const masterKey = process.env.MASTER_KEY;
	if (!masterKey || masterKey.length < 32) {
		throw new Error(
			'MASTER_KEY ausente ou inválida. Define uma chave de no mínimo 32 bytes no .env.',
		);
	}
	// Usa os primeiros 32 bytes da chave (256 bits)
	return Buffer.from(masterKey.slice(0, 64), 'hex');
}

function encryptPasskey(plaintext: string): string {
	const key = getMasterKey();
	const iv = crypto.randomBytes(12); // IV de 96 bits para GCM
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag(); // 16 bytes de autenticação

	// Formato: iv:authTag:ciphertext (tudo em hex)
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPasskey(ciphertext: string): string {
	const key = getMasterKey();
	const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

	if (!ivHex || !authTagHex || !encryptedHex) {
		throw new Error('Formato de ciphertext inválido para AES-256-GCM.');
	}

	const iv = Buffer.from(ivHex, 'hex');
	const authTag = Buffer.from(authTagHex, 'hex');
	const encryptedData = Buffer.from(encryptedHex, 'hex');

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(authTag);

	return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');
}

class CredentialService {
	// Cria uma credencial SMTP para um serviço.
	// A senha é criptografada com AES-256-GCM antes de ser persistida.
	//
	async createCredential(serviceId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [CredentialService] Criando credencial para serviço: ${serviceId}`,
			),
		);

		// Verifica propriedade do serviço
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new CredentialDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const parsedData = createCredentialSchema.parse(data);

		// Criptografa a senha SMTP antes de salvar
		const encryptedPasskey = encryptPasskey(parsedData.passkey);

		const newCredential = await credentialRepository.create({
			name: parsedData.name,
			login: parsedData.login,
			smtpHost: parsedData.smtpHost,
			smtpPort: parsedData.smtpPort,
			smtpSecure: parsedData.smtpSecure,
			passkey: encryptedPasskey,
			serviceId: serviceId,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [CredentialService] Credencial criada: ${newCredential.id}`,
			),
		);
		return newCredential;
	}

	// Lista todas as credenciais ativas de um serviço (sem expor senhas).
	//
	async listCredentials(serviceId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [CredentialService] Listando credenciais do serviço: ${serviceId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new CredentialDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		return credentialRepository.findAllByService(serviceId);
	}

	// Busca uma credencial por ID (sem expor a senha).
	//
	async getCredential(serviceId: string, credentialId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [CredentialService] Buscando credencial: ${credentialId}`,
			),
		);

		// Verifica propriedade do serviço
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new CredentialDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const found = await credentialRepository.findById(credentialId);
		if (!found || found.service_id !== serviceId) {
			throw new CredentialDomainError(
				'Credencial não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'CREDENTIAL_NOT_FOUND',
			);
		}
		return found;
	}

	// Atualiza nome, login e/ou senha de uma credencial.
	// Se a senha for atualizada, é criptografada novamente.
	// Uso interno: descriptografa e retorna a senha em texto plano para uso no envio de e-mail.
	//
	async getDecryptedPasskey(credentialId: string): Promise<string> {
		const found = await credentialRepository.findByIdWithPasskey(credentialId);
		if (!found) {
			throw new CredentialDomainError(
				'Credencial não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'CREDENTIAL_NOT_FOUND',
			);
		}
		return decryptPasskey(found.passkey);
	}

	// Atualiza campos de uma credencial. Se `passkey` for informada, é recriptografada.
	//
	async updateCredential(serviceId: string, credentialId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [CredentialService] Atualizando credencial: ${credentialId}`,
			),
		);

		// Verifica propriedade
		await this.getCredential(serviceId, credentialId, userId);

		const parsedData = updateCredentialSchema.parse(data);

		const updateData: { name?: string; login?: string; passkey?: string } = {
			...(parsedData.name && { name: parsedData.name }),
			...(parsedData.login && { login: parsedData.login }),
			// Recriptografa se nova senha foi informada
			...(parsedData.passkey && { passkey: encryptPasskey(parsedData.passkey) }),
		};

		const updated = await credentialRepository.updateById(credentialId, updateData);
		if (!updated) {
			throw new CredentialDomainError(
				'Credencial não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'CREDENTIAL_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [CredentialService] Credencial atualizada: ${credentialId}`,
			),
		);
		return updated;
	}

	// Soft delete de uma credencial.
	//
	async deleteCredential(serviceId: string, credentialId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [CredentialService] Deletando credencial: ${credentialId}`,
			),
		);

		// Verifica propriedade
		await this.getCredential(serviceId, credentialId, userId);

		const deleted = await credentialRepository.softDeleteById(credentialId);
		if (!deleted) {
			throw new CredentialDomainError(
				'Credencial não encontrada.',
				HttpStatusCode.NOT_FOUND.code,
				'CREDENTIAL_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [CredentialService] Credencial soft-deletada: ${credentialId}`,
			),
		);
		return { id: deleted.id };
	}
}

export default new CredentialService();

// Exporta as funções de criptografia para uso futuro pelo worker BullMQ
export { encryptPasskey, decryptPasskey };
