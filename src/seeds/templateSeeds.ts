import { db } from '../config/dbConfig.js';
import { template } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedTemplates(users: any[], services: any[]) {
	const [adminUser, normalUser] = users;

	const templatesToInsert = [
		// Globais
		{
			id: uuidv4(),
			name: 'Template de Boas Vindas',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Bem-vindo ao {{companyName}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Olá {{name}}, bem-vindo ao sistema global!</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Olá {{name}}, bem-vindo ao sistema global!',
		},
		{
			id: uuidv4(),
			name: 'Recibo de Compra Global',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Seu Recibo Universal #{{orderId}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Aqui está seu recibo: {{amount}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Aqui está seu recibo: {{amount}}',
		},
		{
			id: uuidv4(),
			name: 'Recuperação de Senha',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Recupere sua senha, {{name}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Clique no link para resetar sua senha: {{resetLink}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Clique no link para resetar sua senha: {{resetLink}}',
		},
		// Service E-commerce API (index 0)
		{
			id: uuidv4(),
			name: 'Confirmação de Pedido',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Pedido Confirmado #{{orderId}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Seu pedido foi confirmado!</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Seu pedido foi confirmado!',
		},
		{
			id: uuidv4(),
			name: 'Envio Rastreio',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Seu pacote está a caminho',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Rastreio: {{trackingCode}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Rastreio: {{trackingCode}}',
		},
		// Service Marketing Newsletter (index 1)
		{
			id: uuidv4(),
			name: 'Newsletter Semanal',
			service_id: services[1].id,
			creator_id: services[1].creator_id,
			global: false,
			subject_template: 'Novidades da Semana',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Confira as novidades dessa semana...</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Confira as novidades dessa semana...',
		},
		// Service Internal System Admin (index 2)
		{
			id: uuidv4(),
			name: 'Alerta Crítico',
			service_id: services[2].id,
			creator_id: services[2].creator_id,
			global: false,
			subject_template: '[CRÍTICO] {{alertType}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Erro no sistema: {{error}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Erro no sistema: {{error}}',
		},
		// Service CRM (index 3)
		{
			id: uuidv4(),
			name: 'Contato Efetuado',
			service_id: services[3].id,
			creator_id: services[3].creator_id,
			global: false,
			subject_template: 'Atualização no seu ticket',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Respondemos sua solicitação.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Respondemos sua solicitação.',
		},
		// Service App Mobile (index 4)
		{
			id: uuidv4(),
			name: 'Login Efetuado',
			service_id: services[4].id,
			creator_id: services[4].creator_id,
			global: false,
			subject_template: 'Novo login detectado',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Alguém fez login na sua conta.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Alguém fez login na sua conta.',
		},
		// Service Faturamento (index 5)
		{
			id: uuidv4(),
			name: 'Boleto Vencido',
			service_id: services[5].id,
			creator_id: services[5].creator_id,
			global: false,
			subject_template: 'Aviso de Vencimento',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Seu boleto vence hoje.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Seu boleto vence hoje.',
		},
	];

	const insertedTemplates = await db.insert(template).values(templatesToInsert).returning();
	return insertedTemplates;
}
