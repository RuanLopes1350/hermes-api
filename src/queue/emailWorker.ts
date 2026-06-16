import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import chalk from 'chalk';
import { redisConfig } from '../config/redisConfig.js';
import { getTimestamp } from '../utils/helpers/dateUtils.js';

import { EmailJobPayload } from './emailQueue.js';
import emailRepository from '../repository/emailRepository.js';
import credentialRepository from '../repository/credentialRepository.js';
import templateRepository from '../repository/templateRepository.js';
import serviceRepository from '../repository/serviceRepository.js';
import { decrypt } from '../service/credentialService.js';
import { renderTemplate } from '../utils/renderTemplate.js';

// Handler principal do processamento de emails
async function processEmailJob(job: Job<EmailJobPayload>) {
	const { emailId, serviceId, variables } = job.data;

	console.log(
		chalk.blue(
			`[${getTimestamp()}] [WORKER] Processando envio de email: ${emailId} (Tentativa: ${job.attemptsMade + 1})`,
		),
	);

	// 1. Busca os dados no Banco
	const mailData = await emailRepository.findById(emailId);
	if (!mailData) {
		throw new Error(`Email ID ${emailId} não encontrado no banco.`);
	}
	if (mailData.status === 'sent') {
		console.log(chalk.gray(`[${getTimestamp()}] [WORKER] Email ${emailId} já enviado. Pulando.`));
		return;
	}

	// Busca dados do serviço para carregar settings (como BCC)
	const serviceData = await serviceRepository.findById(serviceId);
	if (!serviceData) {
		throw new Error(`Serviço ID ${serviceId} não encontrado ou deletado.`);
	}

	// 2. Definir e buscar Credencial
	let credIdToUse = mailData.credential_id;
	if (!credIdToUse) {
		const allCreds = await credentialRepository.findAllByService(serviceId);
		if (allCreds.length === 0) {
			throw new Error(
				`Nenhuma credencial cadastrada para o Serviço ID ${serviceId} e nenhuma específica informada.`,
			);
		}
		credIdToUse = allCreds[0].id!;
	}

	const credentialData = await credentialRepository.findById(credIdToUse);
	if (!credentialData) throw new Error(`Dados da Credencial ${credIdToUse} não encontrados.`);

	// 3. Montar Configuração do Transportador
	let transporterConfig: any = {};

	if (credentialData.auth_type === 'oauth2') {
		console.log(
			chalk.magenta(
				`[${getTimestamp()}] [WORKER] OAuth2: Tentando enviar como ${credentialData.login}`,
			),
		);

		if (!credentialData.client_secret || !credentialData.refresh_token) {
			throw new Error('Credenciais OAuth2 incompletas (Client Secret ou Refresh Token ausentes).');
		}

		const clientSecret = decrypt(credentialData.client_secret);
		const refreshToken = decrypt(credentialData.refresh_token);

		// Configuração ultra-detalhada para capturar o erro exato
		transporterConfig = {
			service: 'gmail',
			auth: {
				type: 'OAuth2',
				user: credentialData.login,
				clientId: credentialData.client_id,
				clientSecret: clientSecret,
				refreshToken: refreshToken,
			},
			debug: true,
			logger: true, // ATIVA LOGS DE PROTOCOLO SMTP NO CONSOLE
		};
	} else {
		if (!credentialData.passkey) {
			throw new Error('Passkey SMTP não encontrada para autenticação plain.');
		}
		const plainPasskey = decrypt(credentialData.passkey);
		transporterConfig = {
			host: credentialData.smtp_host,
			port: credentialData.smtp_port,
			secure: credentialData.smtp_secure,
			auth: {
				user: credentialData.login,
				pass: plainPasskey,
			},
		};
	}

	const transporter = nodemailer.createTransport(transporterConfig);

	// 4. Estruturar Template e Variáveis
	let finalHtml = mailData.body || '';
	let finalSubject = mailData.subject;

	if (mailData.service_template_id) {
		const tmpl = await templateRepository.findById(mailData.service_template_id);
		if (tmpl) {
			if (tmpl.compiled_html) {
				const compileBody = Handlebars.compile(tmpl.compiled_html);
				finalHtml = compileBody(variables || {});
			} else if (tmpl.html_content) {
				if (tmpl.html_content.includes('<mjml>')) {
					const { html } = await renderTemplate(tmpl.html_content, variables || {});
					finalHtml = html;
				} else {
					const compileBody = Handlebars.compile(tmpl.html_content);
					finalHtml = compileBody(variables || {});
				}
			}
			if (tmpl.subject_template) {
				const compileSubject = Handlebars.compile(tmpl.subject_template);
				finalSubject = compileSubject(variables || {});
			}
		}
	} else if (finalHtml.includes('<mjml>')) {
		const { html } = await renderTemplate(finalHtml, variables || {});
		finalHtml = html;
	}

	if (!finalHtml) {
		throw new Error(`O e-mail não contém corpo nem template definido.`);
	}

	// 5. Enviar E-mail via Nodemailer
	try {
		const sendOptions: any = {
			from: credentialData.login,
			to: mailData.recipient_to,
			subject: finalSubject,
			html: finalHtml,
		};

		const settings = serviceData.settings as any;
		if (settings && settings.auditBccEmail) {
			sendOptions.bcc = settings.auditBccEmail;
		}

		await transporter.sendMail(sendOptions);

		await emailRepository.updateStatus(emailId, {
			status: 'sent',
			sent_at: new Date(),
			error_log: null,
		});

		console.log(
			chalk.green.bold(
				`[${getTimestamp()}] [WORKER] Email disparado com sucesso! (ID: ${emailId})`,
			),
		);
	} catch (error: any) {
		console.error(chalk.red(`[${getTimestamp()}] [WORKER] Erro Nodemailer: ${error.message}`));

		// Log detalhado do erro SMTP
		if (error.response) console.error(chalk.red(`[SMTP Response]: ${error.response}`));

		await emailRepository.updateStatus(emailId, {
			retry_count: mailData.retry_count + 1,
			status: job.attemptsMade >= 2 ? 'failed' : 'retrying',
			error_log: error.message || 'Unknown SMTP error',
		});

		throw error;
	}
}

export const emailWorker = new Worker('email-queue', processEmailJob, {
	connection: redisConfig,
	concurrency: 5,
	removeOnComplete: { count: 100 },
	removeOnFail: { count: 500 },
});

emailWorker.on('completed', (job) => {
	console.log(chalk.green(`[${getTimestamp()}] [BULLMQ] Job ${job.id} concluído e limpo.`));
});

emailWorker.on('failed', (job, err) => {
	console.error(
		chalk.red.bold(`[${getTimestamp()}] [BULLMQ] Job ${job?.id} falhou: ${err.message}`),
	);
});
