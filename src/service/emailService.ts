import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailRepository from '../repository/emailRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import templateRepository from '../repository/templateRepository.js';
import { createEmailSchema, createBulkEmailSchema } from '../utils/validation/emailValidation.js';
import { emailQueue, priorityMap } from '../queue/emailQueue.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para e-mails
export class EmailDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'EmailDomainError';
	}
}

class EmailService {
	/**
	 * Enfileira um novo e-mail vinculando-o à credencial carimbada na API Key.
	 */
	async createEmail(
		serviceId: string,
		data: unknown,
		apiKeyServiceId: string,
		apiKeyCredentialId: string,
	) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Enfileirando e-mail para serviço: ${serviceId}`,
			),
		);

		// 1. Validação de Segurança
		if (apiKeyServiceId !== serviceId) {
			throw new EmailDomainError(
				'Esta API Key não tem permissão para enviar e-mails neste serviço.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedData = createEmailSchema.parse(data);

		// 2. Buscar Serviço para obter prioridade padrão se necessário
		const serviceData = await serviceRepository.findByIdAndOwner(serviceId, null as any); // Omitimos owner check aqui pois apiKey já valida
		const defaultPriority = (serviceData?.settings as any)?.defaultPriority || 'medium';

		// 3. Validação de Template
		if (parsedData.template_id) {
			const tmpl = await templateRepository.findById(parsedData.template_id);
			
			// Se o template não existir OU (não for global E não pertencer a este serviço)
			if (!tmpl || (!tmpl.global && tmpl.service_id !== serviceId)) {
				throw new EmailDomainError(
					'O template informado não existe ou não pertence a este serviço.',
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'INVALID_TEMPLATE',
				);
			}
		}

		// 4. Persistência
		const finalPriority = (parsedData as any).priority || defaultPriority;

		const newEmail = await emailRepository.create({
			serviceId: serviceId,
			credentialId: apiKeyCredentialId,
			templateId: parsedData.template_id,
			subject: parsedData.subject,
			recipientTo: parsedData.recipient_to,
			body: parsedData.body,
			variables: parsedData.variables,
			scheduledAt: parsedData.scheduled_at ? new Date(parsedData.scheduled_at) : undefined,
			priority: finalPriority,
		});

		// 5. Despacha para a Fila (BullMQ) com peso numérico
		const bullPriority = (priorityMap as any)[finalPriority] || 5;

		await emailQueue.add(
			'sendEmailJob',
			{
				emailId: newEmail.id,
				serviceId: serviceId,
				variables: parsedData.variables,
			},
			{
				priority: bullPriority,
				delay: parsedData.scheduled_at
					? Math.max(0, new Date(parsedData.scheduled_at).getTime() - Date.now())
					: 0,
			},
		);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [EmailService] E-mail enfileirado: ${newEmail.id} (Prioridade: ${finalPriority})`,
			),
		);
		return newEmail;
	}

	/**
	 * Enfileira um lote de e-mails, processando validações e inserções de uma única vez.
	 */
	async createBulkEmails(
		serviceId: string,
		data: unknown,
		apiKeyServiceId: string,
		apiKeyCredentialId: string,
	) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Processando envio em lote para serviço: ${serviceId}`,
			),
		);

		if (apiKeyServiceId !== serviceId) {
			throw new EmailDomainError(
				'Esta API Key não tem permissão para enviar e-mails neste serviço.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedDataArray = createBulkEmailSchema.parse(data);

		const serviceData = await serviceRepository.findByIdAndOwner(serviceId, null as any);
		const defaultPriority = (serviceData?.settings as any)?.defaultPriority || 'medium';

		// Otimização: validar apenas os templates únicos usados no lote
		const uniqueTemplateIds = [...new Set(parsedDataArray.map(item => item.template_id).filter(Boolean))] as string[];
		
		if (uniqueTemplateIds.length > 0) {
			const templatePromises = uniqueTemplateIds.map(id => templateRepository.findById(id));
			const templates = await Promise.all(templatePromises);
			
			for (const tmpl of templates) {
				if (!tmpl || (!tmpl.global && tmpl.service_id !== serviceId)) {
					throw new EmailDomainError(
						`O template referenciado (${tmpl?.id || 'inválido'}) não existe ou não pertence a este serviço.`,
						HttpStatusCode.UNPROCESSABLE_ENTITY.code,
						'INVALID_TEMPLATE',
					);
				}
			}
		}

		// Preparar array para inserção no banco
		const dbPayload = parsedDataArray.map(parsedData => {
			const finalPriority = (parsedData as any).priority || defaultPriority;
			return {
				serviceId: serviceId,
				credentialId: apiKeyCredentialId,
				templateId: parsedData.template_id,
				subject: parsedData.subject,
				recipientTo: parsedData.recipient_to,
				body: parsedData.body,
				variables: parsedData.variables,
				scheduledAt: parsedData.scheduled_at ? new Date(parsedData.scheduled_at) : undefined,
				priority: finalPriority,
			};
		});

		// 1. Insert em massa no PostgreSQL (muito mais rápido que N queries)
		const newEmails = await emailRepository.createBulk(dbPayload);

		// 2. Preparar jobs para o Redis / BullMQ
		const bullJobs = newEmails.map(dbEmail => {
			const bullPriority = (priorityMap as any)[dbEmail.priority] || 5;
			return {
				name: 'sendEmailJob',
				data: {
					emailId: dbEmail.id,
					serviceId: serviceId,
					variables: dbEmail.variables,
				},
				opts: {
					priority: bullPriority,
					delay: dbEmail.scheduled_at
						? Math.max(0, new Date(dbEmail.scheduled_at).getTime() - Date.now())
						: 0,
				}
			};
		});

		// 3. Insert em massa no Redis
		await emailQueue.addBulk(bullJobs);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [EmailService] ${newEmails.length} e-mails enfileirados no Bulk (Redis).`,
			),
		);
		
		return {
			message: `${newEmails.length} e-mails enfileirados com sucesso.`,
			emails: newEmails.map(e => ({ id: e.id, recipient_to: e.recipient_to, status: e.status }))
		};
	}

	async listEmails(serviceId: string, userId: string, status?: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) throw new EmailDomainError('Serviço não encontrado.', 404, 'NOT_FOUND');
		return emailRepository.findAllByService(serviceId, status);
	}

	async getEmail(serviceId: string, emailId: string, userId: string) {
		const found = await emailRepository.findById(emailId);
		if (!found || found.service_id !== serviceId)
			throw new EmailDomainError('E-mail não encontrado.', 404, 'NOT_FOUND');
		return found;
	}

	async cancelEmail(serviceId: string, emailId: string, userId: string) {
		const found = await this.getEmail(serviceId, emailId, userId);
		if (found.status !== 'pending') {
			throw new EmailDomainError(
				`Apenas e-mails pendentes podem ser cancelados. Status: ${found.status}`,
				409,
				'CONFLICT',
			);
		}
		const deleted = await emailRepository.softDeleteById(emailId);
		return { id: deleted.id };
	}
}

export default new EmailService();
