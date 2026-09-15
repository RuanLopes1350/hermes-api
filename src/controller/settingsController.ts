import { Request, Response, NextFunction } from 'express';
import settingsService from '../service/settingsService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class SettingsController {
	async getSettings(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await settingsService.getSanitizedSettings();
			CommonResponse.success(res, data, 200, 'Configurações carregadas.');
		} catch (error) {
			next(error);
		}
	}

	async updateMailConfig(req: Request, res: Response, next: NextFunction) {
		try {
			const updated = await settingsService.updateMailConfig(req.body, req.user!.id);
			CommonResponse.success(res, updated, 200, 'Configurações de e-mail atualizadas.');
		} catch (error) {
			next(error);
		}
	}

	async updateSecurityConfig(req: Request, res: Response, next: NextFunction) {
		try {
			const updated = await settingsService.updateSecurityConfig(req.body, req.user!.id);
			CommonResponse.success(res, updated, 200, 'Configurações de segurança atualizadas.');
		} catch (error) {
			next(error);
		}
	}

	async sendTestEmail(req: Request, res: Response, next: NextFunction) {
		try {
			const result = await settingsService.sendTestEmail(req.body, req.user!.id);
			CommonResponse.success(res, result, 200, result.message);
		} catch (error) {
			next(error);
		}
	}

	async getGoogleAuthUrl(req: Request, res: Response, next: NextFunction) {
		try {
			const url = await settingsService.getGoogleAuthUrl();
			CommonResponse.success(res, { url }, 200);
		} catch (error) {
			next(error);
		}
	}

	async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
		try {
			const redirectUrl = await settingsService.handleGoogleCallback(req.query);
			res.redirect(redirectUrl);
		} catch (error) {
			next(error);
		}
	}
}

export default new SettingsController();
