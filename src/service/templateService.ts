import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateRepository from '../repository/templateRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import {
	createTemplateSchema,
	updateTemplateSchema,
} from '../utils/validation/templateValidation.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para templates
export class TemplateDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'TemplateDomainError';
	}
}

class TemplateService {
	// Cria um novo template HTML/Handlebars.
	async createTemplate(serviceId: string | null, data: unknown, userId: string) {
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
			const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
			if (!serviceExists) {
				throw new TemplateDomainError(
					'Serviço não encontrado ou você não tem permissão.',
					HttpStatusCode.NOT_FOUND.code,
					'SERVICE_NOT_FOUND',
				);
			}
		}

		const newTemplate = await templateRepository.create({
			name: parsedData.name,
			serviceId: parsedData.global ? null : serviceId,
			creatorId: userId,
			global: parsedData.global,
			subjectTemplate: parsedData.subject_template,
			htmlContent: parsedData.html_content,
			textContent: parsedData.text_content,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [TemplateService] Template criado: ${newTemplate.id}`,
			),
		);
		return newTemplate;
	}

	// Lista todos os templates ativos de um serviço.
	async listTemplates(serviceId: string, userId: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}
		return templateRepository.findAllByService(serviceId);
	}

	// Lista todos os templates de um usuário (em todos os serviços + globais).
	async listAllTemplatesByUser(userId: string) {
		return templateRepository.findAllByUser(userId);
	}

	// Busca um template por ID (Global).
	async getTemplateById(templateId: string, userId: string) {
		const found = await templateRepository.findByIdAndUser(templateId, userId);
		if (!found) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}
		return found;
	}

	// Busca um template por ID, verificando que pertence ao serviço do usuário.
	async getTemplate(serviceId: string, templateId: string, userId: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
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
			const srv = await serviceRepository.findByIdAndOwner(found.service_id, userId);
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
	async updateTemplate(
		serviceId: string | null,
		templateId: string,
		data: unknown,
		userId: string,
	) {
		// Verifica propriedade
		await this.ensureOwnership(templateId, userId);

		const parsedData = updateTemplateSchema.parse(data);

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

		return updated;
	}

	// Soft delete de um template.
	async deleteTemplate(templateId: string, userId: string) {
		await this.ensureOwnership(templateId, userId);
		const deleted = await templateRepository.softDeleteById(templateId);
		return { id: deleted!.id };
	}
}

export default new TemplateService();
