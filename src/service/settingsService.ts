import chalk from 'chalk';
import settingsRepository from '../repository/settingsRepository.js';
import { encryptPasskey, decryptPasskey } from './credentialService.js';
import {
	updateMailSettingsSchema,
	updateSecuritySettingsSchema,
	testMailSettingsSchema,
} from '../utils/validation/settingsValidation.js';
import { getAuthUrl, getTokensFromCode } from '../utils/googleAuth.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { SystemMailConfig, SystemSecurityConfig } from '../types/types.js';
import nodemailer from 'nodemailer';

export class SettingsDomainError extends DomainError {
	constructor(message: string, statusCode: number = 400, errorCode: string = 'SETTINGS_ERROR') {
		super(message, statusCode, errorCode);
		this.name = 'SettingsDomain';
	}
}

class SettingsService {
	// Retorna as configurações omitindo senhas/chaves brutas por segurança
	async getSanitizedSettings() {
		const settings = await settingsRepository.getSettings();
		const mail = settings.mail_config;

		return {
			mail: mail
				? {
						provider: mail.provider,
						fromName: mail.fromName,
						fromMail: mail.fromEmail,
						smtpHost: mail.smtpHost || '',
						smtpPort: mail.smtpPort || 587,
						smtpSecure: mail.smtpSecure ?? false,
						login: mail.login || '',
						hasPasskey: !!mail.passkey,
						clientId: mail.clientId || '',
						hasClientSecret: !!mail.clientSecret,
						hasRefreshToken: !!mail.refreshToken,
						isConfigured: mail.isConfigured,
						lastTestedAt: mail.lastTestedAt || null,
					}
				: null,
			security: settings.security_config || {
				resetTokenExpiresInMinutes: 60,
				allowPublicSignUp: false,
			},
			updatedAt: settings.updatedAt,
		};
	}

	async updateMailConfig(data: Partial<SystemMailConfig>, userId: string) {
		const parsed = updateMailSettingsSchema.parse(data);
		const currentSettings = await settingsRepository.getSettings();
		const currentMail = currentSettings.mail_config;

		let newMailConfig: SystemMailConfig;

		if (parsed.provider === 'smtp') {
			if (!parsed.smtpHost || !parsed.smtpPort || !parsed.login) {
				throw new SettingsDomainError('Host, porta e login são obrigatórios para SMTP,', 400);
			}

			// Se não enviou uma nova senha, mantém a senha que já estava gravada
			const passkeyToSave = parsed.passkey ? encryptPasskey(parsed.passkey) : currentMail?.passkey;

			if (!passkeyToSave) {
				throw new SettingsDomainError('A senha SMTP é obrigatória no primeiro cadastro.', 400);
			}

			newMailConfig = {
				provider: 'smtp',
				fromName: parsed.fromName,
				fromEmail: parsed.fromEmail,
				smtpHost: parsed.smtpHost,
				smtpPort: parsed.smtpPort,
				smtpSecure: parsed.smtpSecure ?? false,
				login: parsed.login,
				passkey: passkeyToSave,
				isConfigured: true,
				lastTestedAt: currentMail?.lastTestedAt || null,
			};
		} else {
			// Google OAuth2
			const finalClientId =
				parsed.clientId || currentMail?.clientId || process.env.GOOGLE_CLIENT_ID;
			const clientSecretRaw =
				parsed.clientSecret ||
				(currentMail?.clientSecret
					? decryptPasskey(currentMail.clientSecret)
					: process.env.GOOGLE_CLIENT_SECRET);

			if (!finalClientId || !clientSecretRaw) {
				throw new SettingsDomainError(
					'Client ID e Client Secret do Google são obrigatórios para OAuth2.',
					400,
				);
			}

			newMailConfig = {
				provider: 'google_oauth2',
				fromName: parsed.fromName,
				fromEmail: parsed.fromEmail,
				clientId: finalClientId,
				clientSecret: encryptPasskey(clientSecretRaw),
				refreshToken: currentMail?.refreshToken || undefined,
				isConfigured: !!currentMail?.refreshToken,
				lastTestedAt: currentMail?.lastTestedAt || null,
			};
		}

		await settingsRepository.updateMailConfig(newMailConfig, userId);
		return this.getSanitizedSettings();
	}

	async updateSecurityConfig(data: unknown, userId: string) {
		const parsed = updateSecuritySettingsSchema.parse(data);
		await settingsRepository.updateSecurityConfig(parsed, userId);
		return this.getSanitizedSettings();
	}

	// Constrói o Transporter Nodemailer com base no que está gravado no banco
	async createSystemTransporter(): Promise<{
		transporter: nodemailer.Transporter;
		fromAddress: string;
	}> {
		const settings = await settingsRepository.getSettings();
		const mail = settings.mail_config;

		if (!mail || !mail.isConfigured) {
			throw new SettingsDomainError(
				'O e-mail base do sistema ainda não foi configurado nas Configurações da plataforma.',
				503,
				'SYSTEM_MAIL_NOT_CONFIGURED',
			);
		}

		const fromAddress = `"${mail.fromName}" <${mail.fromEmail}>`;

		if (mail.provider === 'google_oauth2') {
			if (!mail.clientId || !mail.clientSecret || !mail.refreshToken) {
				throw new SettingsDomainError('Credenciais Google OAuth2 incompletas no sistema.', 500);
			}

			const clientSecret = decryptPasskey(mail.clientSecret);
			const refreshToken = decryptPasskey(mail.refreshToken);

			const transporter = nodemailer.createTransport({
				service: 'gmail',
				auth: {
					type: 'OAuth2',
					user: mail.fromEmail,
					clientId: mail.clientId,
					clientSecret: clientSecret,
					refreshToken: refreshToken,
				},
			});

			return { transporter, fromAddress };
		}

		// SMTP Tradicional
		if (!mail.smtpHost || !mail.smtpPort || !mail.login || !mail.passkey) {
			throw new SettingsDomainError('Configurações SMTP incompletas no sistema.', 500);
		}

		const plainPasskey = decryptPasskey(mail.passkey);

		const transporter = nodemailer.createTransport({
			host: mail.smtpHost,
			port: mail.smtpPort,
			secure: mail.smtpSecure ?? true,
			auth: {
				user: mail.login,
				pass: plainPasskey,
			},
		});

		return { transporter, fromAddress };
	}

	async sendTestEmail(data: unknown, userId: string) {
		const parsed = testMailSettingsSchema.parse(data);
		const { transporter, fromAddress } = await this.createSystemTransporter();

		const info = await transporter.sendMail({
			from: fromAddress,
			to: parsed.toEmail,
			subject: 'Hermes Gateway - Teste de configuração de e-mail do sistema',
			text: 'Olá! \n\nEste é um e-mail de teste confirmando que a credencial base do Hermes está funcionando com sucesso!',
			html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f4f5f7; color: #333;">
				<div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<h2 style="color: #2563eb; margin-top: 0;">🕊️ Teste Concluído com Sucesso!</h2>
					<p>Este é um e-mail de teste disparado pelo <strong>Hermes Gateway</strong>.</p>
					<p>Se você recebeu esta mensagem, as configurações de e-mail do sistema estão ativas e funcionando perfeitamente.</p>
					<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
					<small style="color: #888;">Enviado em: ${new Date().toLocaleString('pt-BR')}</small>
				</div>
			</div>
        `,
		});
		// Atualiza o lastTestedAt no banco
		const current = await settingsRepository.getSettings();
		if (current.mail_config) {
			current.mail_config.lastTestedAt = new Date().toISOString();
			await settingsRepository.updateMailConfig(current.mail_config, userId);
		}

		return {
			message: `E-mail de teste enviado para ${parsed.toEmail} com sucesso!`,
			messageId: info.messageId,
		};
	}

	async getGoogleAuthUrl() {
		const settings = await settingsRepository.getSettings();
		const mail = settings.mail_config;

		const clientId = mail?.clientId || process.env.GOOGLE_CLIENT_ID;
		const clientSecret = mail?.clientSecret
			? decryptPasskey(mail.clientSecret)
			: process.env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			throw new SettingsDomainError(
				'Salve o Client ID e Client Secret nas configurações antes de conectar ao Google.',
				400,
			);
		}

		const baseUrl = (process.env.AUTH_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
		const systemRedirectUri = `${baseUrl}/api/callback/google/system`;

		return getAuthUrl(clientId, clientSecret, 'system:settings', systemRedirectUri);
	}

	async handleGoogleCallback(query: any) {
		const { code } = query;
		if (!code) throw new SettingsDomainError('Código ausente no callback.', 400);

		const settings = await settingsRepository.getSettings();
		const mail = settings.mail_config;

		const clientId = mail?.clientId || process.env.GOOGLE_CLIENT_ID;
		const clientSecret = mail?.clientSecret
			? decryptPasskey(mail.clientSecret)
			: process.env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			throw new SettingsDomainError('Configuração Google ausente.', 500);
		}

		const baseUrl = (process.env.AUTH_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
		const systemRedirectUri = `${baseUrl}/api/callback/google/system`;

		const tokens = await getTokensFromCode(clientId, clientSecret, String(code), systemRedirectUri);

		if (!tokens.refresh_token) {
			throw new SettingsDomainError(
				'O Google não retornou um Refresh Token. Remova o acesso do app na conta Google e tente novamente.',
				400,
			);
		}

		if (mail) {
			mail.refreshToken = encryptPasskey(tokens.refresh_token);
			mail.isConfigured = true;
			await settingsRepository.updateMailConfig(mail, null);
		}

		const frontendUrl = (process.env.AUTH_TRUSTED_ORIGINS || 'http://localhost:3000')
			.split(',')[0]
			.trim();
		return `${frontendUrl}/system/settings?auth=success`;
	}
}

export default new SettingsService();
