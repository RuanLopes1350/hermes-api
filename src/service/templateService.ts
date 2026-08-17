import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateRepository from '../repository/templateRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import serviceLogRepository from '../repository/serviceLogRepository.js';
import templateLogRepository from '../repository/templateLogRepository.js';
import {
	createTemplateSchema,
	updateTemplateSchema,
} from '../utils/validation/templateValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { renderTemplate } from '../utils/renderTemplate.js';
import { sanitizeHtml } from '../utils/helpers/sanitizer.js';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { isPlatformAdmin, resolveServiceAccess } from '../utils/authz.js';

// Erro de domínio para templates
export class TemplateDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'TemplateDomainError';
	}
}

class TemplateService {
	// Valida a sintaxe do conteúdo de um template antes de salvar: MJML (estrutura) e
	// Handlebars (variáveis). Lança TemplateDomainError (422) se algo estiver quebrado.
	//
	// IMPORTANTE: Handlebars.compile() sozinho NÃO detecta blocos mal fechados
	// (ex: {{#if x}}...{{/if_typo}}) — o erro só aparece quando o template compilado
	// é de fato invocado. Por isso invocamos com {} aqui, só para validar a sintaxe.
	private validateTemplateContent(htmlContent: string, subjectTemplate?: string | null) {
		if (htmlContent.includes('<mjml>')) {
			try {
				mjml2html(htmlContent, { validationLevel: 'strict' });
			} catch (err: any) {
				throw new TemplateDomainError(
					`O MJML informado é inválido: ${err.message}`,
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'INVALID_MJML',
				);
			}
		}

		try {
			Handlebars.compile(htmlContent)({});
		} catch (err: any) {
			throw new TemplateDomainError(
				`O conteúdo tem um erro de sintaxe Handlebars: ${err.message}`,
				HttpStatusCode.UNPROCESSABLE_ENTITY.code,
				'INVALID_HANDLEBARS',
			);
		}

		if (subjectTemplate) {
			try {
				Handlebars.compile(subjectTemplate)({});
			} catch (err: any) {
				throw new TemplateDomainError(
					`O assunto tem um erro de sintaxe Handlebars: ${err.message}`,
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'INVALID_HANDLEBARS',
				);
			}
		}
	}

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
		// Preview é tolerante a erro: nunca deve estourar um 500 pro usuário só por causa de
		// uma sintaxe MJML/Handlebars inválida enquanto ele ainda está digitando — o erro
		// vira parte do resultado (errors), não uma exceção.
		try {
			const result = await renderTemplate(mjml, variables || {});
			const safeHtml = sanitizeHtml(result.html);

			return {
				html: safeHtml,
				errors: result.errors,
				renderedAt: new Date(),
			};
		} catch (err: any) {
			return {
				html: '',
				errors: [err.message || 'Falha ao renderizar o template.'],
				renderedAt: new Date(),
			};
		}
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
			const access = await resolveServiceAccess(serviceId, currentUser);
			if (!access) {
				throw new TemplateDomainError(
					'Serviço não encontrado ou você não tem permissão.',
					HttpStatusCode.NOT_FOUND.code,
					'SERVICE_NOT_FOUND',
				);
			}
		}

		this.validateTemplateContent(parsedData.html_content, parsedData.subject_template);

		const newTemplate = await templateRepository.create({
			name: parsedData.name,
			serviceId: parsedData.global ? null : serviceId,
			creatorId: userId,
			global: parsedData.global,
			subjectTemplate: parsedData.subject_template,
			htmlContent: parsedData.html_content,
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

		await templateLogRepository.insertLog({
			template_id: newTemplate.id,
			actor_id: userId,
			action: 'TEMPLATE_CREATED',
			description: `Criou o template "${newTemplate.name}"`,
			metadata: {
				snapshot: {
					name: newTemplate.name,
					subject_template: newTemplate.subject_template,
					html_content: newTemplate.html_content,
					text_content: newTemplate.text_content,
					global: newTemplate.global,
					service_id: newTemplate.service_id,
				},
			},
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [TemplateService] Template criado: ${newTemplate.id}`,
			),
		);
		return newTemplate;
	}

	async listTemplates(serviceId: string, currentUser: any) {
		const access = await resolveServiceAccess(serviceId, currentUser);
		if (!access) {
			throw new TemplateDomainError(
				'Serviço não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}
		return templateRepository.findAllByService(serviceId);
	}

	async listAllTemplatesByUser(currentUser: any) {
		if (isPlatformAdmin(currentUser)) {
			return templateRepository.findAllForAdmin();
		}
		return templateRepository.findAllByUser(currentUser.id);
	}

	async getTemplateById(templateId: string, currentUser: any) {
		const found = isPlatformAdmin(currentUser)
			? await templateRepository.findById(templateId)
			: await templateRepository.findByIdAndUser(templateId, currentUser.id);
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
		const access = await resolveServiceAccess(serviceId, currentUser);

		if (!access) {
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
	private async ensureOwnership(templateId: string, currentUser: any) {
		const userId = currentUser.id;
		const found = await templateRepository.findById(templateId);
		if (!found) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}

		if (isPlatformAdmin(currentUser)) return found;

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
		const found = await this.ensureOwnership(templateId, currentUser);

		const parsedData = updateTemplateSchema.parse(data);

		if (parsedData.html_content !== undefined || parsedData.subject_template !== undefined) {
			this.validateTemplateContent(
				parsedData.html_content ?? found.html_content,
				parsedData.subject_template ?? found.subject_template,
			);
		}

		const updated = await templateRepository.updateById(templateId, {
			name: parsedData.name,
			subject_template: parsedData.subject_template,
			html_content: parsedData.html_content,
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

		await templateLogRepository.insertLog({
			template_id: templateId,
			actor_id: userId,
			action: 'TEMPLATE_UPDATED',
			description: `Atualizou o template "${updated.name}"`,
			metadata: {
				snapshot: {
					name: updated.name,
					subject_template: updated.subject_template,
					html_content: updated.html_content,
					text_content: updated.text_content,
					global: updated.global,
					service_id: updated.service_id,
				},
			},
		});

		return updated;
	}

	async deleteTemplate(templateId: string, currentUser: any) {
		const userId = currentUser.id;
		const found = await this.ensureOwnership(templateId, currentUser);
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

		await templateLogRepository.insertLog({
			template_id: templateId,
			actor_id: userId,
			action: 'TEMPLATE_DELETED',
			description: `Excluiu o template "${found.name}"`,
		});

		return { id: deleted!.id };
	}

	async getTemplateLogs(
		templateId: string,
		currentUser: any,
		limit: number = 50,
		offset: number = 0,
	) {
		// Verifica se o usuário tem acesso a esse template
		await this.ensureOwnership(templateId, currentUser);

		return templateLogRepository.findLogsByTemplate(templateId, limit, offset);
	}
}

export default new TemplateService();
