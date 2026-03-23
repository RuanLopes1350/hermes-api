import { Request, Response, NextFunction } from 'express';
import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateService from '../service/templateService.js';
import CommonResponse from '../utils/helpers/commonResponse.js';

class TemplateController {
	// POST /api/services/:serviceId/templates
	async create(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [POST] /api/services/${req.params.serviceId}/templates`),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const newTemplate = await templateService.createTemplate(serviceId, req.body, userId);
			return CommonResponse.created(res, newTemplate, 'Template criado com sucesso!');
		} catch (error) {
			next(error);
		}
	}

	// GET /api/services/:serviceId/templates
	async list(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/templates`),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const userId = req.user!.id;
			const templates = await templateService.listTemplates(serviceId, userId);
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

	// GET /api/services/:serviceId/templates/:id
	async getOne(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [GET] /api/services/${req.params.serviceId}/templates/${req.params.id}`,
			),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const found = await templateService.getTemplate(serviceId, id, userId);
			return CommonResponse.success(res, found, 200, 'Template encontrado.');
		} catch (error) {
			next(error);
		}
	}

	// PATCH /api/services/:serviceId/templates/:id
	async update(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [PATCH] /api/services/${req.params.serviceId}/templates/${req.params.id}`,
			),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const updated = await templateService.updateTemplate(serviceId, id, req.body, userId);
			return CommonResponse.success(res, updated, 200, 'Template atualizado com sucesso.');
		} catch (error) {
			next(error);
		}
	}

	// DELETE /api/services/:serviceId/templates/:id
	async remove(req: Request, res: Response, next: NextFunction) {
		console.log(
			chalk.cyan(
				`[${getTimestamp()}] [DELETE] /api/services/${req.params.serviceId}/templates/${req.params.id}`,
			),
		);
		try {
			const serviceId = String(req.params.serviceId);
			const id = String(req.params.id);
			const userId = req.user!.id;
			const result = await templateService.deleteTemplate(serviceId, id, userId);
			return CommonResponse.success(res, result, 200, 'Template removido com sucesso.');
		} catch (error) {
			next(error);
		}
	}
}

export default new TemplateController();
