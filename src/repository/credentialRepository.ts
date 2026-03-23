import { db } from '../config/dbConfig.js';
import { credential } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

class CredentialRepository {
	// Cria uma nova credencial SMTP para um serviço.
	// O campo `passkey` deve chegar CRIPTOGRAFADO — a criptografia é responsabilidade do Service.
	async create(data: { name: string; login: string; smtpHost: string; smtpPort: number; smtpSecure: boolean; passkey: string; serviceId: string }) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [CredentialRepository] Inserindo credencial...`),
		);
		try {
			const [newCredential] = await db
				.insert(credential)
				.values({
					id: uuidv4(),
					name: data.name,
					smtp_host: data.smtpHost,
					smtp_port: data.smtpPort,
					smtp_secure: data.smtpSecure,
					login: data.login,
					passkey: data.passkey,
					service_id: data.serviceId,
				})
				.returning({
					id: credential.id,
					name: credential.name,
					login: credential.login,
					service_id: credential.service_id,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				});
			return newCredential;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.create');
		}
	}

	// Lista todas as credenciais ativas de um serviço.
	// A senha (`passkey`) é SEMPRE excluída do resultado.
	async findAllByService(serviceId: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [CredentialRepository] Listando credenciais do serviço: ${serviceId}`,
			),
		);
		try {
			return await db
				.select({
					id: credential.id,
					name: credential.name,
					login: credential.login,
					service_id: credential.service_id,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				})
				.from(credential)
				.where(and(eq(credential.service_id, serviceId), isNull(credential.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findAllByService');
		}
	}

	// Busca uma credencial ativa por ID, sem expor a senha.
	async findById(id: string) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [CredentialRepository] Buscando credencial: ${id}`),
		);
		try {
			const [found] = await db
				.select({
					id: credential.id,
					name: credential.name,
					login: credential.login,
					service_id: credential.service_id,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				})
				.from(credential)
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findById');
		}
	}

	// Busca uma credencial ativa por ID incluindo a passkey criptografada.
	// Uso exclusivo interno para descriptografar antes do envio de e-mail.
	async findByIdWithPasskey(id: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [CredentialRepository] Buscando credencial com passkey: ${id}`,
			),
		);
		try {
			const [found] = await db
				.select()
				.from(credential)
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.limit(1);
			return found ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findByIdWithPasskey');
		}
	}

	// Atualiza nome, login e/ou passkey (criptografada) de uma credencial.
	async updateById(id: string, data: { name?: string; login?: string; passkey?: string }) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [CredentialRepository] Atualizando credencial: ${id}`,
			),
		);
		try {
			const [updated] = await db
				.update(credential)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.returning({
					id: credential.id,
					name: credential.name,
					login: credential.login,
					service_id: credential.service_id,
					updatedAt: credential.updatedAt,
				});
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.updateById');
		}
	}

	// Soft delete de uma credencial.
	async softDeleteById(id: string) {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [DB] [CredentialRepository] Soft delete da credencial: ${id}`,
			),
		);
		try {
			const [deleted] = await db
				.update(credential)
				.set({ deletedAt: new Date() })
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.returning({ id: credential.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.softDeleteById');
		}
	}
}

export default new CredentialRepository();
