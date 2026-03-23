import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import templateRepository from '../repository/templateRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import { createTemplateSchema, updateTemplateSchema } from '../utils/validation/templateValidation.js';
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
	// Cria um novo template HTML/Handlebars para um serviço.
	//
	async createTemplate(serviceId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Criando template para serviço: ${serviceId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const parsedData = createTemplateSchema.parse(data);
		const newTemplate = await templateRepository.create({
			name: parsedData.name,
			serviceId: serviceId,
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
	//
	async listTemplates(serviceId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Listando templates do serviço: ${serviceId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		return templateRepository.findAllByService(serviceId);
	}

	// Busca um template por ID, verificando que pertence ao serviço do usuário.
	//
	async getTemplate(serviceId: string, templateId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Buscando template: ${templateId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new TemplateDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const found = await templateRepository.findById(templateId);
		if (!found || found.service_id !== serviceId) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}
		return found;
	}

	// Atualiza campos de um template.
	//
	async updateTemplate(serviceId: string, templateId: string, data: unknown, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Atualizando template: ${templateId}`,
			),
		);

		// Verifica propriedade
		await this.getTemplate(serviceId, templateId, userId);

		const parsedData = updateTemplateSchema.parse(data);
		const updated = await templateRepository.updateById(templateId, {
			name: parsedData.name,
			subject_template: parsedData.subject_template,
			html_content: parsedData.html_content,
			text_content: parsedData.text_content,
		});

		if (!updated) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [TemplateService] Template atualizado: ${templateId}`,
			),
		);
		return updated;
	}

	// Soft delete de um template.
	//
	async deleteTemplate(serviceId: string, templateId: string, userId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [TemplateService] Deletando template: ${templateId}`,
			),
		);

		await this.getTemplate(serviceId, templateId, userId);

		const deleted = await templateRepository.softDeleteById(templateId);
		if (!deleted) {
			throw new TemplateDomainError(
				'Template não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'TEMPLATE_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [TemplateService] Template soft-deletado: ${templateId}`,
			),
		);
		return { id: deleted.id };
	}
}

export default new TemplateService();
