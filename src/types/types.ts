// ==================================================================================
// ============================== BETTER-AUTH =======================================
// ==================================================================================

export type UserType = {
	id?: string;
	name: string;
	email: string;
	emailVerified?: boolean;
	password?: string | null;
	isAdmin?: boolean | null;
	image?: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export type AccountType = {
	id?: string;
	accountId: string;
	providerId: string;
	userId: string;
	accessToken?: string | null;
	refreshToken?: string | null;
	idToken?: string | null;
	accessTokenExpiresAt?: Date | null;
	refreshTokenExpiresAt?: Date | null;
	scope?: string | null;
	password?: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export type SessionType = {
	id?: string;
	expiresAt: Date;
	token: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	userId: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export type VerificationType = {
	id?: string;
	identifier: string;
	value: string;
	expiresAt: Date;
	createdAt?: Date;
	updatedAt?: Date;
};

// ==================================================================================
// ============================== HERMES ============================================
// ==================================================================================

export type MailStatus = 'pending' | 'sent' | 'failed' | 'retrying';

export type ServiceSettingsType = {
	rate_limit?: {
		max_per_minute: number;
		max_per_hour: number;
		max_per_day: number;
	};
	retry: {
		max_attempts: number;
		backoff_strategy: 'exponential' | 'fixed';
		backoff_delay_seconds: number;
	};
	notifications: {
		alert_on_failure: boolean;
		alert_email: string | null;
		webhook_url: string | null;
	};
	interface: {
		theme: 'light' | 'dark';
	};
};

export type ServiceType = {
	id?: string;
	name: string;
	creator_id: string;
	settings?: ServiceSettingsType;
	createdAt?: Date;
	updatedAt?: Date;
};

export type CredentialType = {
	id: string;
	name: string;
	auth_type: 'plain' | 'oauth2';
	smtp_host: string;
	smtp_port: number;
	smtp_secure: boolean;
	login: string;
	passkey?: string | null;
	client_id?: string | null;
	client_secret?: string | null;
	refresh_token?: string | null;
	key_hash: string;
	prefix: string;
	is_active: boolean;
	expires_at?: Date | null;
	service_id: string;
	creator_id: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export type TemplateType = {
	id?: string;
	name: string;
	service_id: string | null;
	subject_template?: string | null;
	html_content: string;
	text_content?: string | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export type EmailType = {
	id?: string;
	service_id: string;
	credential_id?: string | null;
	service_template_id?: string | null;
	subject: string;
	recipient_to: string;
	body?: string | null;
	status?: MailStatus;
	retry_count?: number;
	error_log?: string | null;
	next_retry_at?: Date | null;
	scheduled_at?: Date | null;
	sent_at?: Date | null;
	createdAt?: Date;
};
