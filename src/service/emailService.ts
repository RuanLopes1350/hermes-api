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
	// Enfileira um novo e-mail com status 'pending'.
	//
	// Valida:
	// - O serviceId da rota confere com o serviço da API Key (segurança)
	// - Se credential_id informado, pertence ao mesmo serviço
	// - Se template_id informado, pertence ao mesmo serviço
	// - Pelo menos um de (body OU template_id) deve ser informado
	//
	// IMPORTANTE: O envio real (nodemailer + BullMQ) será implementado na próxima fase.
	// Esta camada está preparada para receber o job: o worker buscará emails com status='pending'.
	//
	async createEmail(serviceId: string, data: unknown, apiKeyServiceId: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Enfileirando e-mail para serviço: ${serviceId}`,
			),
		);

		// Garante que a API Key pertence ao serviceId da rota (evita uso cruzado de keys)
		if (apiKeyServiceId !== serviceId) {
			throw new EmailDomainError(
				'Esta API Key não tem permissão para enviar e-mails neste serviço.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const parsedData = createEmailSchema.parse(data);

		// Valida que credential_id pertence ao serviço (se informado)
		if (parsedData.credential_id) {
			const cred = await credentialRepository.findById(parsedData.credential_id);
			if (!cred || cred.service_id !== serviceId) {
				throw new EmailDomainError(
					'A credencial informada não pertence a este serviço.',
					HttpStatusCode.UNPROCESSABLE_ENTITY.code,
					'INVALID_CREDENTIAL',
				);
			}
		}

		// Valida que template_id pertence ao serviço (se informado)
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

		const newEmail = await emailRepository.create({
			serviceId: serviceId,
			credentialId: parsedData.credential_id,
			templateId: parsedData.template_id,
			subject: parsedData.subject,
			recipientTo: parsedData.recipient_to,
			body: parsedData.body,
			variables: parsedData.variables,
			scheduledAt: parsedData.scheduled_at ? new Date(parsedData.scheduled_at) : undefined,
		});

		// Despacha o Job para a Fila
		await emailQueue.add(
			'sendEmailJob',
			{
				emailId: newEmail.id,
				serviceId: serviceId,
				variables: parsedData.variables,
			},
			{
				// Agenda apenas se scheduled_at for definido para o futuro, senão roda logo.
				// O atributo delay de BullMQ recebe em ms o tempo de espera.
				delay: parsedData.scheduled_at
					? Math.max(0, new Date(parsedData.scheduled_at).getTime() - Date.now())
					: 0,
			},
		);

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [EmailService] E-mail enfileirado: ${newEmail.id} | status: pending`,
			),
		);
		return newEmail;
	}

	// Lista e-mails de um serviço, com filtro opcional de status.
	// Acesso via sessão de usuário autenticado.
	//
	async listEmails(serviceId: string, userId: string, status?: string) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Listando e-mails do serviço: ${serviceId}`,
			),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new EmailDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const validStatuses = ['pending', 'sent', 'failed', 'retrying'];
		if (status && !validStatuses.includes(status)) {
			throw new EmailDomainError(
				`Status inválido. Use: ${validStatuses.join(', ')}.`,
				HttpStatusCode.BAD_REQUEST.code,
				'INVALID_STATUS',
			);
		}

		return emailRepository.findAllByService(serviceId, status);
	}

	// Busca um e-mail por ID, verificando que pertence ao serviço do usuário.
	//
	async getEmail(serviceId: string, emailId: string, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [EmailService] Buscando e-mail: ${emailId}`),
		);

		const serviceExists = await serviceRepository.findByIdAndOwner(serviceId, userId);
		if (!serviceExists) {
			throw new EmailDomainError(
				'Serviço não encontrado ou você não tem permissão para acessá-lo.',
				HttpStatusCode.NOT_FOUND.code,
				'SERVICE_NOT_FOUND',
			);
		}

		const found = await emailRepository.findById(emailId);
		if (!found || found.service_id !== serviceId) {
			throw new EmailDomainError(
				'E-mail não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'EMAIL_NOT_FOUND',
			);
		}
		return found;
	}

	// Cancela (soft delete) um e-mail.
	// Apenas e-mails com status 'pending' podem ser cancelados.
	//
	async cancelEmail(serviceId: string, emailId: string, userId: string) {
		console.log(
			chalk.blue.bold(`[${getTimestamp()}] [INFO] [EmailService] Cancelando e-mail: ${emailId}`),
		);

		const found = await this.getEmail(serviceId, emailId, userId);

		if (found.status !== 'pending') {
			throw new EmailDomainError(
				`Apenas e-mails com status 'pending' podem ser cancelados. Status atual: '${found.status}'.`,
				HttpStatusCode.CONFLICT.code,
				'EMAIL_NOT_CANCELLABLE',
			);
		}

		const deleted = await emailRepository.softDeleteById(emailId);
		if (!deleted) {
			throw new EmailDomainError(
				'E-mail não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'EMAIL_NOT_FOUND',
			);
		}

		console.log(
			chalk.green.bold(`[${getTimestamp()}] [SUCCESS] [EmailService] E-mail cancelado: ${emailId}`),
		);
		return { id: deleted.id };
	}
}

export default new EmailService();
