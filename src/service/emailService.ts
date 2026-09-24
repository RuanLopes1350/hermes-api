import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import emailRepository, { EmailListFilters } from '../repository/emailRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import templateRepository from '../repository/templateRepository.js';
import { createEmailSchema, createBulkEmailSchema } from '../utils/validation/emailValidation.js';
import { emailQueue, priorityMap } from '../queue/emailQueue.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';
import { resolveServiceAccess } from '../utils/authz.js';
import { emailDomainCheck } from '../utils/emailDnsChecker.js';

// Erro de domínio para e-mails
export class EmailDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'EmailDomainError';
	}
}

class EmailService {
	// Enfileira um novo e-mail vinculando-o à credencial carimbada na API Key.
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

		// 2. Verificar se o e-mail possui um registro MX válido
		const check = await emailDomainCheck(parsedData.recipient_to);

		// 3. Buscar Serviço para obter prioridade padrão se necessário
		const serviceData = await serviceRepository.findById(serviceId); // apiKey já validou o acesso
		const defaultPriority = (serviceData?.settings as any)?.defaultPriority || 'medium';

		// 4. Validação de Template (apenas se o e-mail não for ser descartado por MX)
		if (check.valid && parsedData.template_id) {
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

		// 5. Persistência
		const finalPriority = parsedData.priority || defaultPriority;

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
			status: check.valid ? 'pending' : 'failed',
			errorLog: check.valid ? undefined : check.reason || 'Domínio sem registros MX válidos.',
		});

		// 6. Despacha para a Fila (BullMQ) se for válido
		if (check.valid) {
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
		} else {
			console.warn(
				chalk.yellow(
					`[${getTimestamp()}] [WARN] [EmailService] E-mail ${newEmail.id} registrado como 'failed' por domínio inválido: ${check.reason}`,
				),
			);
		}

		return newEmail;
	}

	// Enfileira um lote de e-mails, processando validações e inserções de uma única vez.
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

		// Suporta tanto Array direto `[...]` quanto objeto `{ emails: [...] }` enviado pelo SDK
		const incomingData =
			typeof data === 'object' &&
			data !== null &&
			'emails' in data &&
			Array.isArray((data as any).emails)
				? (data as any).emails
				: data;

		const parsedDataArray = createBulkEmailSchema.parse(incomingData);

		// 2. Verificar registros MX dos domínios dos destinatários
		const recipientEmails = parsedDataArray.map((item) => item.recipient_to);
		const dnsChecks = await emailDomainCheck(recipientEmails);

		// Indexa o resultado DNS por e-mail para consulta rápida
		const dnsCheckByEmail = new Map(dnsChecks.map((c) => [c.email.toLowerCase(), c]));

		// Separa os e-mails em válidos (vão para a fila) e inválidos (registrados como 'failed')
		const validItems = parsedDataArray.filter(
			(item) => dnsCheckByEmail.get(item.recipient_to.toLowerCase())?.valid !== false,
		);
		const invalidItems = parsedDataArray.filter(
			(item) => dnsCheckByEmail.get(item.recipient_to.toLowerCase())?.valid === false,
		);

		if (invalidItems.length > 0) {
			const preview = invalidItems
				.slice(0, 5)
				.map((inv) => {
					const reason =
						dnsCheckByEmail.get(inv.recipient_to.toLowerCase())?.reason || 'domínio sem MX válido';
					return `"${inv.recipient_to}": ${reason}`;
				})
				.join('; ');
			const extra = invalidItems.length > 5 ? ` e mais ${invalidItems.length - 5}` : '';

			console.warn(
				chalk.yellow(
					`[${getTimestamp()}] [WARN] [EmailService] ${invalidItems.length} e-mail(s) com domínio inválido serão registrados como 'failed': ${preview}${extra}`,
				),
			);
		}

		const serviceData = await serviceRepository.findById(serviceId);
		const defaultPriority = (serviceData?.settings as any)?.defaultPriority || 'medium';

		// Otimização: validar apenas os templates únicos usados nos e-mails válidos
		const uniqueTemplateIds = [
			...new Set(validItems.map((item) => item.template_id).filter(Boolean)),
		] as string[];

		if (uniqueTemplateIds.length > 0) {
			const templatePromises = uniqueTemplateIds.map((id) => templateRepository.findById(id));
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

		// Monta o payload de todos os e-mails: inválidos como 'failed', válidos como 'pending'
		const dbPayload = [
			// E-mails com domínio inválido: persiste com status 'failed' e motivo no error_log
			...invalidItems.map((parsedData) => {
				const dnsResult = dnsCheckByEmail.get(parsedData.recipient_to.toLowerCase());
				return {
					serviceId: serviceId,
					credentialId: apiKeyCredentialId,
					templateId: parsedData.template_id,
					subject: parsedData.subject,
					recipientTo: parsedData.recipient_to,
					body: parsedData.body,
					variables: parsedData.variables,
					priority: (parsedData.priority || defaultPriority) as 'high' | 'medium' | 'low',
					status: 'failed' as const,
					errorLog: dnsResult?.reason || 'Domínio sem registros MX válidos.',
				};
			}),
			// E-mails com domínio válido: entra na fila normalmente
			...validItems.map((parsedData) => ({
				serviceId: serviceId,
				credentialId: apiKeyCredentialId,
				templateId: parsedData.template_id,
				subject: parsedData.subject,
				recipientTo: parsedData.recipient_to,
				body: parsedData.body,
				variables: parsedData.variables,
				scheduledAt: parsedData.scheduled_at ? new Date(parsedData.scheduled_at) : undefined,
				priority: (parsedData.priority || defaultPriority) as 'high' | 'medium' | 'low',
			})),
		];

		// 1. Insert em massa no PostgreSQL (todos de uma vez)
		const newEmails = await emailRepository.createBulk(dbPayload);

		// 2. Preparar jobs apenas dos e-mails válidos (que ficaram com status 'pending')
		const pendingEmails = newEmails.filter((e) => e.status === 'pending');
		const bullJobs = pendingEmails.map((dbEmail) => {
			const bullPriority = (priorityMap as any)[dbEmail.priority] || 5;
			return {
				name: 'sendEmailJob',
				data: {
					emailId: dbEmail.id,
					serviceId: serviceId,
					variables: dbEmail.variables as Record<string, any> | undefined,
				},
				opts: {
					priority: bullPriority,
					delay: dbEmail.scheduled_at
						? Math.max(0, new Date(dbEmail.scheduled_at).getTime() - Date.now())
						: 0,
				},
			};
		});

		// 3. Insert em massa no Redis (apenas os pendentes)
		if (bullJobs.length > 0) {
			await emailQueue.addBulk(bullJobs);
		}

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [SUCCESS] [EmailService] Bulk concluído: ${pendingEmails.length} enfileirado(s), ${invalidItems.length} registrado(s) como 'failed'.`,
			),
		);

		return {
			message:
				`${pendingEmails.length} e-mail(s) enfileirado(s). ${invalidItems.length > 0 ? `${invalidItems.length} rejeitado(s) por domínio inválido.` : ''}`.trim(),
			emails: newEmails.map((e) => ({ id: e.id, recipient_to: e.recipient_to, status: e.status })),
		};
	}

	async listEmails(
		serviceId: string,
		currentUser: any,
		filters: EmailListFilters = {},
		limit: number = 50,
		offset: number = 0,
	) {
		const access = await resolveServiceAccess(serviceId, currentUser);
		if (!access) throw new EmailDomainError('Serviço não encontrado.', 404, 'NOT_FOUND');
		return emailRepository.findAllByService(serviceId, filters, limit, offset);
	}

	async listUserEmails(
		currentUser: any,
		filters: EmailListFilters = {},
		limit: number = 50,
		offset: number = 0,
		serviceId?: string,
	) {
		const userId = currentUser.id;
		if (serviceId) {
			const access = await resolveServiceAccess(serviceId, currentUser);
			if (!access) {
				throw new EmailDomainError('Serviço não encontrado.', 404, 'NOT_FOUND');
			}
		}

		return emailRepository.findAllByUser(
			userId,
			currentUser.role === 'super_admin' || currentUser.role === 'admin',
			filters,
			limit,
			offset,
			serviceId,
		);
	}

	async exportUserEmails(currentUser: any, filters: EmailListFilters = {}, serviceId?: string) {
		const userId = currentUser.id;
		if (serviceId) {
			const access = await resolveServiceAccess(serviceId, currentUser);
			if (!access) {
				throw new EmailDomainError('Serviço não encontrado.', 404, 'NOT_FOUND');
			}
		}

		return emailRepository.exportByUser(
			userId,
			currentUser.role === 'super_admin' || currentUser.role === 'admin',
			filters,
			serviceId,
		);
	}

	async getEmail(serviceId: string, emailId: string, currentUser: any) {
		const found = await emailRepository.findById(emailId);
		if (!found || found.service_id !== serviceId)
			throw new EmailDomainError('E-mail não encontrado.', 404, 'NOT_FOUND');

		const access = await resolveServiceAccess(serviceId, currentUser);
		if (!access) throw new EmailDomainError('Acesso negado.', 403, 'FORBIDDEN');

		return found;
	}

	async cancelEmail(serviceId: string, emailId: string, user: any) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Cancelando e-mail ${emailId} do serviço: ${serviceId}`,
			),
		);

		// 1. Validação de Acesso
		const access = await resolveServiceAccess(serviceId, user);
		if (!access) {
			throw new EmailDomainError(
				'Serviço não encontrado ou acesso negado.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		// 2. Busca e validação do e-mail
		const existingEmail = await emailRepository.findById(emailId);
		if (!existingEmail || existingEmail.service_id !== serviceId) {
			throw new EmailDomainError(
				'E-mail não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'NOT_FOUND',
			);
		}

		if (existingEmail.status !== 'pending') {
			throw new EmailDomainError(
				'Apenas e-mails pendentes podem ser cancelados.',
				HttpStatusCode.BAD_REQUEST.code,
				'BAD_REQUEST',
			);
		}

		// 3. Deleta (Soft Delete)
		await emailRepository.softDeleteById(emailId);
		return { message: 'E-mail cancelado com sucesso.' };
	}

	// Tenta reenviar (re-enqueue) um e-mail que falhou (DLQ).
	async retryEmail(serviceId: string, emailId: string, user: any) {
		console.log(
			chalk.blue.bold(
				`[${getTimestamp()}] [INFO] [EmailService] Retrying e-mail ${emailId} do serviço: ${serviceId}`,
			),
		);

		const access = await resolveServiceAccess(serviceId, user);
		if (!access) {
			throw new EmailDomainError(
				'Serviço não encontrado ou acesso negado.',
				HttpStatusCode.FORBIDDEN.code,
				'FORBIDDEN',
			);
		}

		const existingEmail = await emailRepository.findById(emailId);
		if (!existingEmail || existingEmail.service_id !== serviceId) {
			throw new EmailDomainError(
				'E-mail não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'NOT_FOUND',
			);
		}

		if (existingEmail.status !== 'failed') {
			throw new EmailDomainError(
				'Apenas e-mails falhos podem ser reprocessados.',
				HttpStatusCode.BAD_REQUEST.code,
				'BAD_REQUEST',
			);
		}

		await emailRepository.updateStatus(emailId, { status: 'pending', error_log: null });

		await emailQueue.add(
			'send-email',
			{
				emailId: existingEmail.id,
				serviceId: existingEmail.service_id,
				variables:
					typeof existingEmail.variables === 'string'
						? JSON.parse(existingEmail.variables)
						: existingEmail.variables || {},
			},
			{
				priority: priorityMap[existingEmail.priority || 'normal'],
				attempts: 3,
				backoff: { type: 'exponential', delay: 2000 },
			},
		);

		return { message: 'E-mail reenfileirado com sucesso!', id: existingEmail.id };
	}
}

export default new EmailService();
