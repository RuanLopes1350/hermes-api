import { db } from '../config/dbConfig.js';
import { system_settings } from '../config/db/schema.js';
import { eq } from 'drizzle-orm';
import {
	SystemMailConfig,
	SystemSecurityConfig,
	ServiceSettingsType,
	SystemSettingsType,
} from '../types/types.js';
import { parseDatabaseError } from '../utils/helpers/dbErrors.js';

const SINGLETON_ID = 'singleton';

const DEFAULT_SECURITY_CONFIG: SystemSecurityConfig = {
	resetTokenExpiresInMinutes: 60,
	allowPublicSignUp: false,
};

class SettingsRepository {
	async getSettings(): Promise<SystemSettingsType> {
		try {
			const [existing] = await db
				.select()
				.from(system_settings)
				.where(eq(system_settings.id, SINGLETON_ID));
			if (existing) {
				return {
					...existing,
					mail_config: (existing.mail_config as SystemMailConfig) || null,
					security_config:
						(existing.security_config as SystemSecurityConfig) || DEFAULT_SECURITY_CONFIG,
				};
			}

			// Se não existir, incializa o registro singleton
			const [created] = await db
				.insert(system_settings)
				.values({ id: SINGLETON_ID, mail_config: null, security_config: DEFAULT_SECURITY_CONFIG })
				.returning();

			return {
				...created,
				mail_config: null,
				security_config: DEFAULT_SECURITY_CONFIG,
			};
		} catch (error) {
			throw parseDatabaseError(error, 'SettingsRepository.getSettings');
		}
	}

	async updateMailConfig(
		mailConfig: SystemMailConfig,
		userId: string,
	): Promise<SystemSettingsType> {
		try {
			await this.getSettings(); // Garante que a linha existe

			const [updated] = await db
				.update(system_settings)
				.set({
					mail_config: mailConfig,
					updatedAt: new Date(),
					updatedBy: userId,
				})
				.where(eq(system_settings.id, SINGLETON_ID))
				.returning();

			return {
				...updated,
				mail_config: updated.mail_config as SystemMailConfig,
				security_config:
					(updated.security_config as SystemSecurityConfig) || DEFAULT_SECURITY_CONFIG,
			};
		} catch (error) {
			throw parseDatabaseError(error, 'SettingsRepository.updateMailConfig');
		}
	}

	async updateSecurityConfig(
		securityConfig: SystemSecurityConfig,
		userId: string,
	): Promise<SystemSettingsType> {
		try {
			await this.getSettings();

			const [updated] = await db
				.update(system_settings)
				.set({
					security_config: securityConfig,
					updatedAt: new Date(),
					updatedBy: userId,
				})
				.where(eq(system_settings.id, SINGLETON_ID))
				.returning();

			return {
				...updated,
				mail_config: updated.mail_config as SystemMailConfig,
				security_config: updated.security_config as SystemSecurityConfig,
			};
		} catch (error) {
			throw parseDatabaseError(error, 'SettingsRepository.updateSecurityConfig');
		}
	}
}

export default new SettingsRepository();
