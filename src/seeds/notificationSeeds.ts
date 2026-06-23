import { db } from '../config/dbConfig.js';
import { notification } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { subDays, subHours, subMinutes } from 'date-fns';

export async function seedNotifications(services: any[]) {
	// Pega os primeiros serviços para espalhar as notificações
	const s1 = services[0];
	const s2 = services[1];
	const s3 = services[2];

	const now = new Date();

	const notificationsToInsert = [
		// Erros Críticos (Webhook Falhou)
		{
			id: uuidv4(),
			service_id: s1.id,
			type: 'error' as const,
			title: 'Falha na Rotação de Chave',
			message: 'A rotação automática falhou pois o webhook recusou a conexão (Timeout 5000ms).',
			is_read: false,
			createdAt: subMinutes(now, 15),
		},
		{
			id: uuidv4(),
			service_id: s3.id,
			type: 'error' as const,
			title: 'Acesso Negado no Webhook',
			message: 'O servidor de destino retornou 403 Forbidden durante a tentativa de atualizar a credencial "Chave Produção".',
			is_read: false,
			createdAt: subHours(now, 2),
		},
		// Avisos (Warnings)
		{
			id: uuidv4(),
			service_id: s1.id,
			type: 'warning' as const,
			title: 'Chave Próxima da Expiração',
			message: 'A chave "App Mobile iOS" expirará em 2 dias. A rotação automática está desativada para este serviço.',
			is_read: false,
			createdAt: subHours(now, 5),
		},
		{
			id: uuidv4(),
			service_id: s2.id,
			type: 'warning' as const,
			title: 'Cota de E-mails Próxima do Limite',
			message: 'O serviço atingiu 90% da franquia de envios do SMTP configurado.',
			is_read: true,
			createdAt: subDays(now, 1),
		},
		// Sucessos (Success)
		{
			id: uuidv4(),
			service_id: s1.id,
			type: 'success' as const,
			title: 'Chave Rotacionada Automaticamente',
			message: 'A chave "Web Client" foi rotacionada com sucesso e enviada ao webhook cadastrado.',
			is_read: true,
			createdAt: subDays(now, 2),
		},
		{
			id: uuidv4(),
			service_id: s3.id,
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
			type: 'info' as const,
			title: 'Novo Template Adicionado',
			message: 'O usuário "Admin" criou um novo template MJML para o serviço.',
			is_read: true,
			createdAt: subDays(now, 5),
		},
	];

	if (s1 && s2 && s3) {
		await db.insert(notification).values(notificationsToInsert);
	}
}
