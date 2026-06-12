import { db } from '../config/dbConfig.js';
import { credential, service, service_member } from '../config/db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';
import { CredentialType } from '../types/types.js';

class CredentialRepository {
	async create(data: {
		name: string;
		login: string;
		smtpHost: string;
		smtpPort: number;
		smtpSecure: boolean;
		passkey?: string | null;
		authType?: 'plain' | 'oauth2';
		clientId?: string | null;
		clientSecret?: string | null;
		serviceId: string;
		creatorId: string;
		keyHash: string;
		prefix: string;
		expiresAt?: Date | null;
	}) {
		console.log(chalk.magenta(`[${getTimestamp()}] [DB] [CredentialRepository] Inserindo credencial...`));
		try {
			const [newCredential] = await db
				.insert(credential)
				.values({
					id: uuidv4(),
					name: data.name,
					auth_type: data.authType || 'plain',
					smtp_host: data.smtpHost,
					smtp_port: data.smtpPort,
					smtp_secure: data.smtpSecure ?? true,
					login: data.login,
					passkey: data.passkey,
					client_id: data.clientId,
					client_secret: data.clientSecret,
					service_id: data.serviceId,
					creator_id: data.creatorId,
					key_hash: data.keyHash,
					prefix: data.prefix,
					expiresAt: data.expiresAt,
					is_active: true,
				})
				.returning();
			return newCredential;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.create');
		}
	}

	async findAllByService(serviceId: string): Promise<Partial<CredentialType>[]> {
		try {
			return await db
				.select({
					id: credential.id,
					name: credential.name,
					auth_type: credential.auth_type,
					login: credential.login,
					service_id: credential.service_id,
					refresh_token: credential.refresh_token,
					prefix: credential.prefix,
					is_active: credential.is_active,
					expiresAt: credential.expiresAt,
					creator_id: credential.creator_id,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				})
				.from(credential)
				.where(and(eq(credential.service_id, serviceId), isNull(credential.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findAllByService');
		}
	}

	async findAllByUser(userId: string): Promise<Partial<CredentialType>[]> {
		try {
			return await db
				.select({
					id: credential.id,
					name: credential.name,
					auth_type: credential.auth_type,
					login: credential.login,
					service_id: credential.service_id,
					refresh_token: credential.refresh_token,
					prefix: credential.prefix,
					is_active: credential.is_active,
					expiresAt: credential.expiresAt,
					creator_id: credential.creator_id,
					createdAt: credential.createdAt,
					updatedAt: credential.updatedAt,
				})
				.from(credential)
				.innerJoin(service_member, eq(credential.service_id, service_member.service_id))
				.where(and(eq(service_member.user_id, userId), isNull(credential.deletedAt)));
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findAllByUser');
		}
	}

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

	async findByKeyHash(hash: string): Promise<CredentialType | null> {
		try {
			const [found] = await db
				.select()
				.from(credential)
				.where(and(eq(credential.key_hash, hash), isNull(credential.deletedAt), eq(credential.is_active, true)))
				.limit(1);
			return (found as CredentialType) ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.findByKeyHash');
		}
	}

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

	async deleteById(id: string) {
		try {
			const [deleted] = await db
				.delete(credential)
				.where(eq(credential.id, id))
				.returning({ id: credential.id });
			return deleted ?? null;
		} catch (error) {
			throw parseDatabaseError(error, 'CredentialRepository.deleteById');
		}
	}
}

export default new CredentialRepository();
