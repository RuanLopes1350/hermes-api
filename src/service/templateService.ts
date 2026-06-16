import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateRepository from '../repository/templateRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import serviceLogRepository from '../repository/serviceLogRepository.js';
import {
	createTemplateSchema,
	updateTemplateSchema,
} from '../utils/validation/templateValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { renderTemplate } from '../utils/renderTemplate.js';
import { sanitizeHtml } from '../utils/helpers/sanitizer.js';
import mjml2html from 'mjml';

// Erro de domínio para templates
export class TemplateDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'TemplateDomainError';
	}
}

class TemplateService {
	// Pre-visualiza um template
	async previewTemplate(data: any) {
		const { mjml, variables } = data;
		if (!mjml) {
			throw new TemplateDomainError(
				'O conteúdo MJML é obrigatório.',
				HttpStatusCode.BAD_REQUEST.code,
				'MJML_REQUIRED',
			);
		}
		const result = await renderTemplate(mjml, variables || {});

		// Sanitização contra XSS
		const safeHtml = sanitizeHtml(result.html);

		return {
			html: safeHtml,
			errors: result.errors,
			renderedAt: new Date(),
		};
	}

	async createTemplate(params: any, data: any, currentUser: any) {
		const serviceId = params.serviceId || data.service_id || null;
		const userId = currentUser.id;

		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Criando template. ServiceId: ${serviceId}`,
			),
		);

		const parsedData = createTemplateSchema.parse(data);

		// Se não for global, exige serviceId válido
		if (!parsedData.global) {
			if (!serviceId) {
				throw new TemplateDomainError(
					'Um serviço deve ser selecionado para templates não-globais.',
					HttpStatusCode.BAD_REQUEST.code,
					'SERVICE_REQUIRED',
				);
			}
			const serviceExists = await serviceRepository.findServiceAndUserRole(serviceId, userId);
			if (!serviceExists) {
				throw new TemplateDomainError(
					'Serviço não encontrado ou você não tem permissão.',
					HttpStatusCode.NOT_FOUND.code,
					'SERVICE_NOT_FOUND',
				);
			}
		}

		let compiledHtml = parsedData.html_content;
		if (parsedData.html_content.includes('<mjml>')) {
			try {
				const result = await mjml2html(parsedData.html_content, { validationLevel: 'soft' });
				compiledHtml = result.html;
			} catch (err: any) {
				console.error('[TemplateService] Erro ao compilar MJML para AOT:', err);
			}
		}

		const newTemplate = await templateRepository.create({
			name: parsedData.name,
			serviceId: parsedData.global ? null : serviceId,
			creatorId: userId,
			global: parsedData.global,
			subjectTemplate: parsedData.subject_template,
			htmlContent: parsedData.html_content,
			compiledHtml: compiledHtml,
			textContent: parsedData.text_content,
		});

		if (newTemplate.service_id) {
			await serviceLogRepository.insertLog({
				service_id: newTemplate.service_id,
				actor_id: userId,
				action: 'TEMPLATE_CREATED',
				description: `Criou o template "${newTemplate.name}"`,
				metadata: { template_id: newTemplate.id },
			});
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [TemplateService] Template criado: ${newTemplate.id}`,
			),
		);
		return newTemplate;
	}

	async listTemplates(serviceId: string, currentUser: any) {
		const userId = currentUser.id;
		const serviceExists = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}
		return templateRepository.findAllByService(serviceId);
	}

	async listAllTemplatesByUser(currentUser: any) {
		return templateRepository.findAllByUser(currentUser.id);
	}

	async getTemplateById(templateId: string, currentUser: any) {
		const found = await templateRepository.findByIdAndUser(templateId, currentUser.id);
		if (!found) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}
		return found;
	}

	async getTemplate(serviceId: string, templateId: string, currentUser: any) {
		const userId = currentUser.id;
		const serviceExists = await serviceRepository.findServiceAndUserRole(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const found = await templateRepository.findById(templateId);
		if (!found || (found.service_id !== serviceId && !found.global)) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}
		return found;
	}

	// Verifica se o usuário pode gerenciar (editar/deletar) o template.
	private async ensureOwnership(templateId: string, userId: string) {
		const found = await templateRepository.findById(templateId);
		if (!found) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}

		// Se tem service_id, verifica se o usuário é dono do serviço
		if (found.service_id) {
			const srv = await serviceRepository.findServiceAndUserRole(found.service_id, userId);
			if (srv) return found;
		}

		// Se é o criador do template
		if (found.creator_id === userId) return found;

		throw new TemplateDomainError(
			'Você não tem permissão para gerenciar este template.',
			HttpStatusCode.FORBIDDEN.code,
			'ACCESS_DENIED',
		);
	}

	// Atualiza campos de um template.
	async updateTemplate(params: any, data: any, currentUser: any) {
		const serviceId = params.serviceId || data.service_id || null;
		const templateId = params.id;
		const userId = currentUser.id;

		// Verifica propriedade
		const found = await this.ensureOwnership(templateId, userId);

		const parsedData = updateTemplateSchema.parse(data);

		let compiledHtml: string | undefined = undefined;
		if (parsedData.html_content !== undefined) {
			compiledHtml = parsedData.html_content;
			if (parsedData.html_content && parsedData.html_content.includes('<mjml>')) {
				try {
					const result = await mjml2html(parsedData.html_content, { validationLevel: 'soft' });
					compiledHtml = result.html;
				} catch (err: any) {
					console.error('[TemplateService] Erro ao compilar MJML para AOT:', err);
				}
			}
		}

		const updated = await templateRepository.updateById(templateId, {
			name: parsedData.name,
			subject_template: parsedData.subject_template,
			html_content: parsedData.html_content,
			compiled_html: compiledHtml,
			text_content: parsedData.text_content,
			global: parsedData.global,
			service_id: parsedData.service_id,
		});

		if (!updated) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}

		if (updated.service_id) {
			await serviceLogRepository.insertLog({
				service_id: updated.service_id,
				actor_id: userId,
				action: 'TEMPLATE_UPDATED',
				description: `Atualizou o template "${updated.name}"`,
				metadata: { template_id: templateId },
			});
		}

		return updated;
	}

	async deleteTemplate(templateId: string, currentUser: any) {
		const userId = currentUser.id;
		const found = await this.ensureOwnership(templateId, userId);
		const deleted = await templateRepository.softDeleteById(templateId);

		if (found.service_id) {
			await serviceLogRepository.insertLog({
				service_id: found.service_id,
				actor_id: userId,
				action: 'TEMPLATE_DELETED',
				description: `Excluiu o template "${found.name}"`,
				metadata: { template_id: templateId },
			});
		}

		return { id: deleted!.id };
	}
}

export default new TemplateService();
