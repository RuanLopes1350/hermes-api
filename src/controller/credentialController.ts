import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import credentialService from '../service/credentialService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class CredentialController {
	// POST /api/services/:serviceId/credentials
	async create(req: Request, res: Response, next: NextFunction) {
		console.log(chalk.cyan(`[${getTimestamp()}] [POST] /api/services/${req.params.serviceId}/credentials`));
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const result = await credentialService.createCredential(serviceId, req.body, userId);
			return CommonResponse.created(res, result, 'Credencial e API Key criadas com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/credentials
	async list(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const credentials = await credentialService.listCredentials(serviceId, userId);
			return CommonResponse.success(res, credentials, 200, `${credentials.length} credencial(is) encontrada(s).`);
		} catch (error) {
			next(error);
		}
	}

    // NOVO: GET /api/credentials (Global)
    async listGlobal(req: Request, res: Response, next: NextFunction) {
        console.log(chalk.cyan(`[${getTimestamp()}] [GET] /api/credentials`));
        try {
            const userId = req.user!.id;
            const credentials = await credentialService.listAllUserCredentials(userId);
            return CommonResponse.success(res, credentials, 200, `${credentials.length} credencial(is) encontrada(s).`);
        } catch (error) {
            next(error);
        }
    }

	async getOne(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const found = await credentialService.getCredential(serviceId, id, userId);
			return CommonResponse.success(res, found, 200, 'Credencial encontrada.');
		} catch (error) {
			next(error);
		}
	}

	async update(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const updated = await credentialService.updateCredential(serviceId, id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'Credencial atualizada com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	async remove(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const result = await credentialService.deleteCredential(serviceId, id, userId);
			return CommonResponse.success(res, result, 200, 'Credencial removida com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// OAuth2 flow (Google)
	async authorizeGoogle(req: Request, res: Response, next: NextFunction) {
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const url = await credentialService.getGoogleAuthUrl(serviceId, id, userId);
			return res.redirect(url);
		} catch (error) {
			next(error);
		}
	}

	async callbackGoogle(req: Request, res: Response, next: NextFunction) {
		try {
			const { code, state: credentialId } = req.query;
			if (!code || !credentialId) throw new Error('Parâmetros inválidos no callback do Google.');
			await credentialService.finishGoogleAuth(String(credentialId), String(code));
			// Redireciona de volta para o dashboard
			return res.send('<h1>Autenticação concluída!</h1><p>Você já pode fechar esta aba e voltar ao dashboard do Hermes.</p>');
		} catch (error) {
			next(error);
		}
	}
}

export default new CredentialController();
