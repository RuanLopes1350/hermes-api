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
import { CredentialType } from '../types/types.js';

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
		// Se não tiver credencial informada, puxar a primeira ativa do Serviço
		const allCreds = await credentialRepository.findAllByService(serviceId);
		if (allCreds.length === 0) {
			throw new Error(
				`Nenhuma credencial cadastrada para o Serviço ID ${serviceId} e nenhuma específica informada.`,
			);
		}
		credIdToUse = allCreds[0].id;
	}

	const plainPasskey = await credentialService.getDecryptedPasskey(credIdToUse);
	const credentialData: Partial<CredentialType> = await credentialRepository.findById(credIdToUse);
	if (!credentialData) throw new Error(`Dados da Credencial ${credIdToUse} não encontrados.`);

	// 3. Montar Transporter do Nodemailer com os dados da credencial
	const transporter = nodemailer.createTransport({
		host: credentialData.smtp_host,
		port: credentialData.smtp_port,
		secure: credentialData.smtp_secure, // true para 465, false para outras portas
		auth: {
			user: credentialData.login,
			pass: plainPasskey, // Utiliza a senha/app_password descriptografada do Aes-256
		},
	});

	// 4. Estruturar Template e Variáveis
	let finalHtml = mailData.body || '';
	let finalSubject = mailData.subject;

	if (mailData.service_template_id) {
		const tmpl = await templateRepository.findById(mailData.service_template_id);
		if (tmpl) {
			// Compila HTML via Handlebars
			if (tmpl.html_content) {
				const compileHtml = Handlebars.compile(tmpl.html_content);
				finalHtml = compileHtml(variables || {});
			}
			// Compila o Assunto se tiver variáveis Handlebars
			if (tmpl.subject_template) {
				const compileSubject = Handlebars.compile(tmpl.subject_template);
				finalSubject = compileSubject(variables || {});
			}
		}
	}

	// Verifica se existe body final, senão envia array vazio
	if (!finalHtml) {
		throw new Error(`O e-mail não contém corpo nem template definido.`);
	}

	// 5. Enviar E-mail via Nodemailer
	try {
		await transporter.sendMail({
			from: credentialData.login, // Usa o login configurado
			to: mailData.recipient_to,
			subject: finalSubject,
			html: finalHtml,
		});

		// 6. Atualiza o Status para Sent
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

		// Atualiza o banco com retrying ou failed, a depender do erro
		// O BullMQ cuida do numero de tentativas
		await emailRepository.updateStatus(emailId, {
			retry_count: mailData.retry_count + 1,
			status: job.attemptsMade >= 2 ? 'failed' : 'retrying',
			error_log: error.message || 'Unknown SMTP error',
		});

		// Propaga o erro para o BullMQ registrar tentativa falha
		throw error;
	}
}

// Inicializa a escuta da Fila (Worker process)
export const emailWorker = new Worker<EmailJobPayload>('email-queue', processEmailJob, {
	connection: redisConfig,
	concurrency: 5, // Processa 5 emails por vez

	// Configurações nativas de limpeza do BullMQ:
	removeOnComplete: {
		count: 100, // Mantém apenas os últimos 100 jobs com sucesso no Redis (ótimo para log/debug)
		// age: 3600 // (Opcional) ou você pode remover por idade (ex: jobs mais velhos que 1 hora)
	},
	removeOnFail: {
		count: 500, // Mantém um histórico maior para jobs que falharam, facilitando troubleshooting
	},
});

emailWorker.on('completed', (job) => {
	// Apenas log opcional. O BullMQ já apagou o job do Redis (se passou do limite do count).
	console.log(
		chalk.green(`[${getTimestamp()}] [BULLMQ] Job ${job.id} concluído e limpo automaticamente.`),
	);
});

emailWorker.on('failed', (job, err) => {
	console.error(
		chalk.red.bold(`[${getTimestamp()}] [BULLMQ] Job ${job?.id} falhou. Motivo: ${err.message}`),
	);
});
