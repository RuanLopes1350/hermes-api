import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailRepository from '../repository/emailRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import credentialRepository from '../repository/credentialRepository.js';
import templateRepository from '../repository/templateRepository.js';
import { createEmailSchema } from '../utils/validation/emailValidation.js';
import { emailQueue } from '../queue/emailQueue.js';
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
        apiKeyCredentialId: string // NOVO: Credencial obrigatória da chave
    ) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Enfileirando e-mail para serviço: ${serviceId}`,
			),
		);

		// 1. Validação de Segurança: API Key pertence ao serviço da rota?
		if (apiKeyServiceId !== serviceId) {
			throw new EmailDomainError(
				'Esta API Key não tem permissão para enviar e-mails neste serviço.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedData = createEmailSchema.parse(data);

		// 2. Validação de Template (se informado)
		if (parsedData.template_id) {
			const tmpl = await templateRepository.findById(parsedData.template_id);
			if (!tmpl || tmpl.service_id !== serviceId) {
				throw new EmailDomainError(
					'O template informado não pertence a este serviço.',
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'INVALID_TEMPLATE',
				);
			}
		}

		// 3. Persistência
		// IMPORTANTE: Ignoramos o credential_id do body (se enviado) e usamos o da API KEY
		const newEmail = await emailRepository.create({
			serviceId: serviceId,
			credentialId: apiKeyCredentialId, // FORÇA O USO DA CREDENCIAL DA CHAVE
			templateId: parsedData.template_id,
			subject: parsedData.subject,
			recipientTo: parsedData.recipient_to,
			body: parsedData.body,
			variables: parsedData.variables,
			scheduledAt: parsedData.scheduled_at ? new Date(parsedData.scheduled_at) : undefined,
		});

		// 4. Despacha para a Fila (BullMQ)
		await emailQueue.add(
			'sendEmailJob',
			{
				emailId: newEmail.id,
				serviceId: serviceId,
				variables: parsedData.variables,
			},
			{
				delay: parsedData.scheduled_at
					? Math.max(0, new Date(parsedData.scheduled_at).getTime() - Date.now())
					: 0,
			},
		);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [EmailService] E-mail enfileirado: ${newEmail.id} vinculado à credencial ${apiKeyCredentialId}`,
			),
		);
		return newEmail;
	}

	async listEmails(serviceId: string, userId: string, status?: string) {
		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) throw new EmailDomainError('Serviço não encontrado.', 404, 'NOT_FOUND');
		return emailRepository.findAllByService(serviceId, status);
	}

	async getEmail(serviceId: string, emailId: string, userId: string) {
		const found = await emailRepository.findById(emailId);
		if (!found || found.service_id !== serviceId) throw new EmailDomainError('E-mail não encontrado.', 404, 'NOT_FOUND');
		return found;
	}

	async cancelEmail(serviceId: string, emailId: string, userId: string) {
		const found = await this.getEmail(serviceId, emailId, userId);
		if (found.status !== 'pending') {
			throw new EmailDomainError(`Apenas e-mails pendentes podem ser cancelados. Status: ${found.status}`, 409, 'CONFLICT');
		}
		const deleted = await emailRepository.softDeleteById(emailId);
		return { id: deleted.id };
	}
}

export default new EmailService();
