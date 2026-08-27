import { db } from '../config/dbConfig.js';
import { email } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import {
	randomInt,
	randomChoice,
	weightedChoice,
	atRandomTimeOnDay,
	minutesFromNow,
	daysFromNow,
} from './seedHelpers.js';

const ERROR_MESSAGES = [
	'Connection Timeout with SMTP server',
	'SMTP Authentication failed (535 5.7.8)',
	'Recipient address rejected: mailbox unavailable',
	'Rate limit exceeded on provider, retry later',
	'DNS lookup failed for MX record',
	'TLS handshake failed with upstream server',
];

interface ServiceEmailProfile {
	serviceIndex: number;
	// e-mails por dia (min, max) nos dias "normais"
	volume: [number, number];
	// chance (0-1) de o dia ter volume zero (serviços de campanha não disparam todo dia)
	skipChance: number;
	subjects: (n: number) => string[];
	recipientDomain: string;
	recipientPrefix: string;
}

const PROFILES: ServiceEmailProfile[] = [
	{
		serviceIndex: 0, // E-commerce API
		volume: [8, 26],
		skipChance: 0,
		subjects: (n) => [
			`Pedido Confirmado #${1000 + n}`,
			'Seu pacote está a caminho',
			'Bem-vindo ao E-commerce',
			'Recuperação de Senha',
			`Reembolso processado #${1000 + n}`,
		],
		recipientDomain: 'exemplo.com',
		recipientPrefix: 'cliente',
	},
	{
		serviceIndex: 1, // Marketing Newsletter
		volume: [3, 18],
		skipChance: 0.35,
		subjects: () => ['Novidades da Semana', 'Promoção Relâmpago', 'Edição Especial do Mês'],
		recipientDomain: 'exemplo.com',
		recipientPrefix: 'assinante',
	},
	{
		serviceIndex: 2, // Internal System Admin
		volume: [0, 6],
		skipChance: 0.2,
		subjects: (n) => [
			`[CRÍTICO] CPU em ${90 + (n % 10)}%`,
			'[CRÍTICO] Disco em 95% de uso',
			'[AVISO] Backup concluído com atraso',
			'[INFO] Deploy finalizado com sucesso',
		],
		recipientDomain: 'hermes.com',
		recipientPrefix: 'suporte',
	},
	{
		serviceIndex: 3, // CRM Notificações
		volume: [1, 10],
		skipChance: 0.1,
		subjects: (n) => [`Atualização no seu ticket #${5000 + n}`, 'Novo contato registrado no CRM'],
		recipientDomain: 'exemplo.com',
		recipientPrefix: 'lead',
	},
	{
		serviceIndex: 4, // App Mobile Notifier
		volume: [2, 14],
		skipChance: 0.05,
		subjects: (n) => ['Novo login detectado', `Código de verificação: ${100000 + n}`],
		recipientDomain: 'app-exemplo.com',
		recipientPrefix: 'usuario',
	},
	{
		serviceIndex: 5, // Faturamento Automático
		volume: [0, 5],
		skipChance: 0.15,
		subjects: (n) => ['Aviso de Vencimento', `Boleto Emitido #${9000 + n}`],
		recipientDomain: 'faturamento-exemplo.com',
		recipientPrefix: 'cliente',
	},
	{
		serviceIndex: 6, // Sistema de RH
		volume: [0, 2],
		skipChance: 0.5,
		subjects: () => ['Admissão de Colaborador', 'Lembrete: Avaliação de Desempenho'],
		recipientDomain: 'empresa-exemplo.com',
		recipientPrefix: 'colaborador',
	},
];

const DAYS_BACK = 45;

export async function seedEmails(services: any[], templates: any[], credentials: any[]) {
	const rows: (typeof email.$inferInsert)[] = [];

	for (const profile of PROFILES) {
		const service = services[profile.serviceIndex];
		const svcTemplates = templates.filter((t) => t.service_id === service.id && !t.deletedAt);
		const globalTemplates = templates.filter((t) => t.global);
		const svcCredentials = credentials.filter((c) => c.service_id === service.id);

		for (let daysBack = 0; daysBack < DAYS_BACK; daysBack++) {
			if (Math.random() < profile.skipChance) continue;

			const count = randomInt(profile.volume[0], profile.volume[1]);
			// Dias mais recentes (0-1) podem ter estados "em voo" (pending/retrying);
			// dias antigos só terminam em sent/failed — não faz sentido um job de
			// 40 dias atrás ainda estar "pendente".
			const isRecent = daysBack <= 1;

			for (let i = 0; i < count; i++) {
				const createdAt = atRandomTimeOnDay(daysBack);
				const status = isRecent
					? weightedChoice<'sent' | 'failed' | 'retrying' | 'pending'>([
							['sent', 78],
							['failed', 6],
							['retrying', 8],
							['pending', 8],
						])
					: weightedChoice<'sent' | 'failed' | 'retrying' | 'pending'>([
							['sent', 90],
							['failed', 10],
						]);

				const priority = weightedChoice<'high' | 'medium' | 'low'>([
					['high', 15],
					['medium', 60],
					['low', 25],
				]);

				const pickedTemplate =
					svcTemplates.length > 0 && Math.random() > 0.15
						? randomChoice(svcTemplates)
						: globalTemplates.length > 0
							? randomChoice(globalTemplates)
							: null;

				const subjectOptions = profile.subjects(i);
				const subject = randomChoice(subjectOptions);
				const recipient = `${profile.recipientPrefix}${randomInt(1, 400)}@${profile.recipientDomain}`;

				const row: typeof email.$inferInsert = {
					id: uuidv4(),
					service_id: service.id,
					credential_id: svcCredentials.length > 0 ? randomChoice(svcCredentials).id : null,
					service_template_id: pickedTemplate?.id ?? null,
					subject,
					recipient_to: recipient,
					variables: {},
					status,
					priority,
					retry_count: 0,
					createdAt,
				};

				if (status === 'sent') {
					const latencyMs = randomInt(400, 18000);
					row.sent_at = new Date(createdAt.getTime() + latencyMs);
				} else if (status === 'failed') {
					row.error_log = randomChoice(ERROR_MESSAGES);
					row.retry_count = randomInt(1, 3);
				} else if (status === 'retrying') {
					row.error_log = randomChoice(ERROR_MESSAGES);
					row.retry_count = randomInt(1, 2);
					row.next_retry_at = minutesFromNow(randomInt(1, 45));
				} else if (status === 'pending') {
					// Metade dos pendentes são agendamentos futuros de verdade
					// (alimenta o KPI "Próximo Agendado" no dashboard do usuário).
					if (Math.random() < 0.5) {
						row.scheduled_at = daysFromNow(randomInt(0, 3));
					}
				}

				rows.push(row);
			}
		}
	}

	// Um pequeno lote histórico no serviço soft-deleted (Sistema Legado), datado
	// de ANTES da exclusão — testa se os agregados do dashboard realmente
	// ignoram e-mails de serviços com deletedAt preenchido.
	const legacyService = services[7];
	if (legacyService) {
		for (let i = 0; i < 6; i++) {
			const createdAt = atRandomTimeOnDay(randomInt(32, 45));
			rows.push({
				id: uuidv4(),
				service_id: legacyService.id,
				credential_id: null,
				service_template_id: null,
				subject: 'Notificação Legada',
				recipient_to: `legado${randomInt(1, 20)}@old-exemplo.com`,
				variables: {},
				status: 'sent',
				priority: 'low',
				retry_count: 0,
				sent_at: new Date(createdAt.getTime() + 2000),
				createdAt,
			});
		}
	}

	// Uma linha soft-deleted isolada — testa o filtro de deletedAt na própria
	// tabela email (independente do serviço estar ou não deletado).
	const ecommerce = services[0];
	rows.push({
		id: uuidv4(),
		service_id: ecommerce.id,
		credential_id: null,
		service_template_id: null,
		subject: 'Teste de Envio (removido)',
		recipient_to: 'teste-removido@exemplo.com',
		variables: {},
		status: 'sent',
		priority: 'low',
		retry_count: 0,
		sent_at: atRandomTimeOnDay(10),
		createdAt: atRandomTimeOnDay(10),
		deletedAt: atRandomTimeOnDay(9),
	});

	const insertedEmails = await db.insert(email).values(rows).returning();
	return insertedEmails;
}
