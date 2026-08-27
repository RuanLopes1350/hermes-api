import { db } from '../config/dbConfig.js';
import { service_log } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

// Timeline de auditoria (aba "Atividade Recente" do dashboard) — usa os
// mesmos nomes de ação que serviceService.ts e credentialService.ts geram em
// produção, só que aqui inseridos direto (bypassa o repository, que sempre
// usa defaultNow() e não deixa datar o passado).
export async function seedServiceLogs(services: any[], members: any[], users: any[], credentials: any[]) {
	const userById = new Map(users.map((u) => [u.id, u]));
	const rows: (typeof service_log.$inferInsert)[] = [];

	const addLog = (
		serviceId: string,
		actorId: string | null,
		action: string,
		description: string,
		createdAt: Date,
		metadata: Record<string, any> = {},
	) => {
		rows.push({
			id: uuidv4(),
			service_id: serviceId,
			actor_id: actorId,
			action,
			description,
			metadata,
			createdAt,
		});
	};

	// SERVICE_CREATED — um por serviço, na própria data de criação.
	for (const s of services) {
		addLog(
			s.id,
			s.creator_id,
			s.deletedAt ? 'SERVICE_CREATED' : 'SERVICE_CREATED',
			`Criou o serviço "${s.name}"`,
			s.createdAt,
			{ service_id: s.id },
		);
	}

	// MEMBER_ADDED — um por vínculo em service_member, pouco depois da criação
	// do serviço (exceto o próprio owner, que "nasce" junto com o serviço).
	for (const m of members) {
		if (m.role === 'owner') continue;
		const service = services.find((s) => s.id === m.service_id);
		if (!service) continue;
		const addedAt = new Date(service.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
		const memberUser = userById.get(m.user_id);
		addLog(
			m.service_id,
			service.creator_id,
			'MEMBER_ADDED',
			`Adicionou ${memberUser?.name ?? 'um membro'} ao serviço`,
			addedAt,
			{ user_id: m.user_id },
		);
	}

	// Um MEMBER_REMOVED e um OWNERSHIP_TRANSFERRED narrativos — cobrem os dois
	// ícones de timeline que não apareceriam de outra forma (getActionIcon no
	// dashboard trata REMOVED como "saída" e TRANSFERRED como "atualização").
	const ecommerce = services[0];
	const sysAdmin = services[2];
	if (ecommerce) {
		addLog(
			ecommerce.id,
			ecommerce.creator_id,
			'MEMBER_REMOVED',
			'Removeu um colaborador que não fazia mais parte do time',
			new Date(ecommerce.createdAt.getTime() + 20 * 24 * 60 * 60 * 1000),
			{},
		);
	}
	if (sysAdmin) {
		addLog(
			sysAdmin.id,
			sysAdmin.creator_id,
			'OWNERSHIP_TRANSFERRED',
			'Transferiu a posse do serviço para outro membro da equipe',
			new Date(sysAdmin.createdAt.getTime() + 40 * 24 * 60 * 60 * 1000),
			{},
		);
	}

	// SERVICE_DELETED — só o serviço legado, na data real do soft-delete.
	const legacy = services.find((s) => s.deletedAt);
	if (legacy) {
		addLog(
			legacy.id,
			legacy.creator_id,
			'SERVICE_DELETED',
			`Removeu o serviço "${legacy.name}"`,
			legacy.deletedAt,
			{},
		);
	}

	// Credenciais — CREATED pra todas, DELETED pra soft-deleted, OAUTH_LINKED
	// pras oauth2, e uma rotação manual narrativa.
	for (const c of credentials) {
		addLog(
			c.service_id,
			c.creator_id,
			'CREDENTIAL_CREATED',
			`Criou a credencial "${c.name}"`,
			c.createdAt,
			{ credential_id: c.id },
		);
		if (c.auth_type === 'oauth2') {
			addLog(
				c.service_id,
				null,
				'CREDENTIAL_OAUTH_LINKED',
				`A credencial "${c.name}" vinculou com sucesso o token OAuth2 no Google`,
				new Date(c.createdAt.getTime() + 60 * 60 * 1000),
				{ credential_id: c.id },
			);
		}
		if (c.deletedAt) {
			addLog(
				c.service_id,
				c.creator_id,
				'CREDENTIAL_DELETED',
				`Excluiu a credencial "${c.name}"`,
				c.deletedAt,
				{ credential_id: c.id },
			);
		}
	}

	const rotatable = credentials.find((c) => c.name === 'SendGrid Produção');
	if (rotatable) {
		addLog(
			rotatable.service_id,
			rotatable.creator_id,
			'API_KEY_ROTATED_MANUALLY',
			`A chave da credencial "${rotatable.name}" foi rotacionada manualmente. Webhook: Falhou (Timeout 5000ms)`,
			new Date(rotatable.createdAt.getTime() + 10 * 24 * 60 * 60 * 1000),
			{ webhookDispatched: false, webhookSkipped: false },
		);
	}

	await db.insert(service_log).values(rows);
	return rows;
}
