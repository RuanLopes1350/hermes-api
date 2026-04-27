import { db } from '../config/dbConfig.js';
import { credential, service } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';
import { CredentialType } from '../types/types.js';

class CredentialRepository {
	// Cria uma nova credencial para um serviço.
	async create(data: {
		name: string;
		login: string;
		smtpHost: string;
		smtpPort: number;
		smtpSecure: boolean;
		passkey?: string;
		authType?: 'plain' | 'oauth2';
		clientId?: string;
		clientSecret?: string;
		serviceId: string;
	}) {
		console.log(
			chalk.magenta(`[${getTimestamp()}] [DB] [CredentialRepository] Inserindo credencial...`),
		);
		try {
			const [newCredential] = await db
				.insert(credential)
				.values({
					id: uuidv4(),
					name: data.name,
					auth_type: data.authType || 'plain',
					smtp_host: data.smtpHost,
					smtp_port: data.smtpPort,
					smtp_secure: data.smtpSecure,
					login: data.login,
					passkey: data.passkey,
					client_id: data.clientId,
					client_secret: data.clientSecret,
					service_id: data.serviceId,
				})
				.returning();
			return newCredential;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.create');
		}
	}

	// Lista todas as credenciais ativas de um serviço.
	async findAllByService(serviceId: string): Promise<Partial<CredentialType>[]> {
		try {
			return await db
				.select({
					id: credential.id,
					name: credential.name,
					auth_type: credential.auth_type,
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

    // NOVO: Lista todas as credenciais de um usuário (em todos os seus serviços)
    async findAllByUser(userId: string): Promise<Partial<CredentialType>[]> {
        try {
            return await db
                .select({
                    id: credential.id,
                    name: credential.name,
                    auth_type: credential.auth_type,
                    login: credential.login,
                    service_id: credential.service_id,
                    createdAt: credential.createdAt,
                    updatedAt: credential.updatedAt,
                })
                .from(credential)
                .innerJoin(service, eq(credential.service_id, service.id))
                .where(and(eq(service.owner_id, userId), isNull(credential.deletedAt)));
        } catch (error) {
            throw parseDatabaseError(error, 'CredentialRepository.findAllByUser');
        }
    }

	// Busca uma credencial ativa por ID.
	async findById(id: string): Promise<CredentialType | null> {
		try {
			const [found] = await db
				.select()
				.from(credential)
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.limit(1);
			return (found as CredentialType) ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findById');
		}
	}

	async findByIdWithPasskey(id: string): Promise<CredentialType | null> {
		return this.findById(id);
	}

	// Atualiza campos de uma credencial.
	async updateById(id: string, data: any) {
		try {
			const [updated] = await db
				.update(credential)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(credential.id, id), isNull(credential.deletedAt)))
				.returning();
			return updated ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.updateById');
		}
	}

	// Soft delete de uma credencial.
	async softDeleteById(id: string) {
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
