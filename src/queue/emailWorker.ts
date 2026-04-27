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
import credentialService from '../service/credentialService.js';

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

	// 3. Montar Transporter do Nodemailer
	let authConfig: any = {};

	if (credentialData.auth_type === 'oauth2') {
		console.log(chalk.magenta(`[${getTimestamp()}] [WORKER] Utilizando autenticação OAuth2 do Google.`));
		
		const clientSecret = await credentialService.getDecryptedPasskey(credentialData.client_secret!);
		const refreshToken = await credentialService.getDecryptedPasskey(credentialData.refresh_token!);

		authConfig = {
			type: 'OAuth2',
			user: credentialData.login,
			clientId: credentialData.client_id,
			clientSecret: clientSecret,
			refreshToken: refreshToken,
		};
	} else {
		const plainPasskey = await credentialService.getDecryptedPasskey(credIdToUse);
		authConfig = {
			user: credentialData.login,
			pass: plainPasskey,
		};
	}

	const transporter = nodemailer.createTransport({
		host: credentialData.smtp_host,
		port: credentialData.smtp_port,
		secure: credentialData.smtp_secure, 
		auth: authConfig,
	});

	// 4. Estruturar Template e Variáveis
	let finalHtml = mailData.body || '';
	let finalSubject = mailData.subject;

	if (mailData.service_template_id) {
		const tmpl = await templateRepository.findById(mailData.service_template_id);
		if (tmpl) {
			if (tmpl.html_content) {
				const compileHtml = Handlebars.compile(tmpl.html_content);
				finalHtml = compileHtml(variables || {});
			}
			if (tmpl.subject_template) {
				const compileSubject = Handlebars.compile(tmpl.subject_template);
				finalSubject = compileSubject(variables || {});
			}
		}
	}

	if (!finalHtml) {
		throw new Error(`O e-mail não contém corpo nem template definido.`);
	}

	// 5. Enviar E-mail via Nodemailer
	try {
		await transporter.sendMail({
			from: credentialData.login, 
			to: mailData.recipient_to,
			subject: finalSubject,
			html: finalHtml,
		});

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
		console.error(
			chalk.red(`[${getTimestamp()}] [WORKER] Erro Nodemailer ao enviar email: ${error.message}`),
		);

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
	console.error(chalk.red.bold(`[${getTimestamp()}] [BULLMQ] Job ${job?.id} falhou: ${err.message}`));
});
