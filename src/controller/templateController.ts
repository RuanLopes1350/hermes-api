import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateService from '../service/templateService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class TemplateController {
	// POST /api/services/:serviceId/templates/preview
	async preview(req: Request, res: Response, next: NextFunction) {
		try {
			const result = await templateService.previewTemplate(req.body);
			return res.json(result);
		} catch (error) {
			next(error);
		}
	}

	// POST /api/services/:serviceId/templates OR POST /api/templates
	async create(req: Request, res: Response, next: NextFunction) {
		try {
			const newTemplate = await templateService.createTemplate(req.params, req.body, req.user);
			return CommonResponse.created(res, newTemplate, 'Template criado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/templates (Global)
	async listAll(req: Request, res: Response, next: NextFunction) {
		try {
			const templates = await templateService.listAllTemplatesByUser(req.user);
			return CommonResponse.success(
				res,
				templates,
				200,
				`${templates.length} template(s) encontrado(s).`,
			);
		} catch (error) {
			next(error);
		}
	}

	// GET /api/templates/:id (Global)
	async getOneGlobal(req: Request, res: Response, next: NextFunction) {
		try {
			const found = await templateService.getTemplateById(String(req.params.id), req.user);
			return CommonResponse.success(res, found, 200, 'Template encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/templates/:id
	async update(req: Request, res: Response, next: NextFunction) {
		try {
			const updated = await templateService.updateTemplate(req.params, req.body, req.user);
			return CommonResponse.success(res, updated, 200, 'Template atualizado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/templates/:id
	async remove(req: Request, res: Response, next: NextFunction) {
		try {
			const result = await templateService.deleteTemplate(String(req.params.id), req.user);
			return CommonResponse.success(res, result, 200, 'Template removido com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/templates
	async list(req: Request, res: Response, next: NextFunction) {
		try {
			const templates = await templateService.listTemplates(String(req.params.serviceId), req.user);
			return CommonResponse.success(
				res,
				templates,
				200,
				`${templates.length} template(s) encontrado(s).`,
			);
		} catch (error) {
			next(error);
		}
	}
}

export default new TemplateController();
