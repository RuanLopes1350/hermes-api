import { db } from '../config/dbConfig.js';
import { notification } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { subDays, subHours, subMinutes } from 'date-fns';

export async function seedNotifications(services: any[], users: any[]) {
	// Pega os primeiros serviços para espalhar as notificações
	const s1 = services[0];
	const s2 = services[1];
	const s3 = services[2];
	const [admin] = users;

	const now = new Date();

	const notificationsToInsert = [
		// Erros Críticos (Webhook Falhou)
		{
			id: uuidv4(),
			service_id: s1.id,
			user_id: null,
			type: 'error' as const,
			title: 'Falha na Rotação de Chave',
			message: 'A rotação automática falhou pois o webhook recusou a conexão (Timeout 5000ms).',
			is_read: false,
			createdAt: subMinutes(now, 15),
		},
		{
			id: uuidv4(),
			service_id: s3.id,
			user_id: null,
			type: 'error' as const,
			title: 'Acesso Negado no Webhook',
			message:
				'O servidor de destino retornou 403 Forbidden durante a tentativa de atualizar a credencial "Chave Produção".',
			is_read: false,
			createdAt: subHours(now, 2),
		},
		// Avisos (Warnings)
		{
			id: uuidv4(),
			service_id: s1.id,
			user_id: null,
			type: 'warning' as const,
			title: 'Credencial Desativada Detectada',
			message:
				'A credencial "SMTP Legado (Desativado)" está inativa. Os próximos envios que dependerem dela falharão silenciosamente.',
			is_read: false,
			createdAt: subHours(now, 5),
		},
		{
			id: uuidv4(),
			service_id: s2.id,
			user_id: null,
			type: 'warning' as const,
			title: 'Chave Próxima da Expiração',
			message: 'A credencial "Chave Campanha Q3" expira em 2 dias. Considere rotacioná-la.',
			is_read: true,
			createdAt: subDays(now, 1),
		},
		// Sucessos (Success)
		{
			id: uuidv4(),
			service_id: s1.id,
			user_id: null,
			type: 'success' as const,
			title: 'Chave Rotacionada Automaticamente',
			message: 'A chave "Web Client" foi rotacionada com sucesso e enviada ao webhook cadastrado.',
			is_read: true,
			createdAt: subDays(now, 2),
		},
		{
			id: uuidv4(),
			service_id: s3.id,
			user_id: null,
			type: 'success' as const,
			title: 'Credencial SMTP Validada',
			message: 'As configurações de SMTP foram testadas com sucesso (Ping: 45ms).',
			is_read: true,
			createdAt: subDays(now, 3),
		},
		// Informação (Info)
		{
			id: uuidv4(),
			service_id: s2.id,
			user_id: null,
			type: 'info' as const,
			title: 'Novo Template Adicionado',
			message: 'O usuário "Admin" criou um novo template MJML para o serviço.',
			is_read: true,
			createdAt: subDays(now, 5),
		},
		// Notificação direta ao usuário (user_id preenchido, service_id nulo) —
		// o schema suporta os dois modos, mas nenhum seed anterior demonstrava este.
		{
			id: uuidv4(),
			service_id: null,
			user_id: admin.id,
			type: 'info' as const,
			title: 'Bem-vindo(a) de volta',
			message: 'Você tem 2 credenciais inativas e 1 próxima da expiração aguardando revisão.',
			is_read: false,
			createdAt: subHours(now, 1),
		},
	];

	if (s1 && s2 && s3) {
		await db.insert(notification).values(notificationsToInsert);
	}
}
