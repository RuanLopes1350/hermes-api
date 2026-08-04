import 'express';

declare global {
	namespace Express {
		interface Request {
			serviceId?: string;
			credentialId?: string;
			user?: {
				id: string;
				name: string;
				email: string;
				emailVerified: boolean;
				role: 'super_admin' | 'admin' | 'user';
				isActive: boolean | null;
				image?: string | null;
				createdAt: Date;
				updatedAt: Date;
			};
			session?: {
				id: string;
				expiresAt: Date;
				token: string;
				ipAddress?: string | null;
				userAgent?: string | null;
				userId: string;
			};
		}
	}
}
