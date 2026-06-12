import { db } from '../config/dbConfig.js';
import { email } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedEmails(services: any[], templates: any[]) {
	// Pega os serviços
	const ecommerceAPI = services[0];
	const marketingNews = services[1];
	const sysAdmin = services[2];

	// Pega os templates (0, 1, 2 = Globais | 3, 4 = Ecommerce | 5 = Marketing | 6 = Admin)
	const globalWelcome = templates[0];
	const orderConfirm = templates[3];
	const rastreio = templates[4];
	const newsletter = templates[5];
	const alerta = templates[6];

	const now = Date.now();
	const msInDay = 1000 * 60 * 60 * 24;

	const emailsToInsert = [
		{
			id: uuidv4(),
			service_id: ecommerceAPI.id,
			service_template_id: orderConfirm.id,
			subject: 'Pedido Confirmado #1001',
			recipient_to: 'cliente1@exemplo.com',
			variables: { orderId: '1001' },
			status: 'sent' as const,
			priority: 'high' as const,
			sent_at: new Date(now - msInDay * 2), // 2 dias atrás
			createdAt: new Date(now - msInDay * 2 - 1000),
		},
		{
			id: uuidv4(),
			service_id: ecommerceAPI.id,
			service_template_id: rastreio.id,
			subject: 'Seu pacote está a caminho',
			recipient_to: 'cliente1@exemplo.com',
			variables: { trackingCode: 'BR123456789' },
			status: 'pending' as const,
			priority: 'medium' as const,
			createdAt: new Date(),
		},
		{
			id: uuidv4(),
			service_id: marketingNews.id,
			service_template_id: newsletter.id,
			subject: 'Novidades de Junho',
			recipient_to: 'assinante1@exemplo.com',
			variables: {},
			status: 'sent' as const,
			priority: 'low' as const,
			sent_at: new Date(now - msInDay * 5), // 5 dias atrás
			createdAt: new Date(now - msInDay * 5 - 2000),
		},
		{
			id: uuidv4(),
			service_id: marketingNews.id,
			service_template_id: newsletter.id,
			subject: 'Promoção Relâmpago',
			recipient_to: 'assinante2@exemplo.com',
			variables: {},
			status: 'failed' as const,
			priority: 'medium' as const,
			error_log: 'Connection Timeout with SMTP server',
			createdAt: new Date(now - msInDay * 1),
		},
		{
			id: uuidv4(),
			service_id: sysAdmin.id,
			service_template_id: alerta.id,
			subject: '[CRÍTICO] CPU em 99%',
			recipient_to: 'suporte@hermes.com',
			variables: { alertType: 'CPU overload', error: 'CPU em 99%' },
			status: 'retrying' as const,
			priority: 'high' as const,
			retry_count: 2,
			next_retry_at: new Date(now + 1000 * 60 * 5),
			createdAt: new Date(now - 1000 * 60 * 10), // 10 min atrás
		},
		{
			id: uuidv4(),
			service_id: ecommerceAPI.id,
			service_template_id: globalWelcome.id,
			subject: 'Bem-vindo ao E-commerce',
			recipient_to: 'novo_cliente@exemplo.com',
			variables: { name: 'João', companyName: 'E-commerce API' },
			status: 'sent' as const,
			priority: 'medium' as const,
			sent_at: new Date(now - msInDay * 10), // 10 dias atrás
			createdAt: new Date(now - msInDay * 10 - 5000),
		},
	];

	const insertedEmails = await db.insert(email).values(emailsToInsert).returning();
	return insertedEmails;
}
