import { Response } from 'express';
import chalk from 'chalk';
import { redisPub } from '../config/redisConfig.js';
import { getTimestamp } from '../utils/helpers/dateUtils.js';

const LAST_SEEN_KEY_PREFIX = 'presence:last-seen:';

class PresenceService {
	// userId -> conexões SSE abertas daquele usuário (uma por aba/dispositivo).
	// Isso é (e deve ser) só em memória: um Response não sobrevive a um restart,
	// e depois de um restart não existe mesmo nenhuma conexão real aberta ainda
	// — a reconexão automática do cliente (useSSE) reconstrói isso sozinha.
	private online = new Map<string, Set<Response>>();
	// conexões de admins observando o painel de presença em tempo real
	private listeners = new Set<Response>();
	// userId -> timestamp da última transição de presença conhecida (ficou
	// online ou ficou offline). Não é "login" no sentido de autenticação —
	// é uma aproximação de atividade derivada da conexão SSE, útil justamente
	// porque o `session.updatedAt` do Better Auth é impreciso (só atualiza a
	// cada `updateAge`, por padrão 1x por dia) e não representa presença real.
	//
	// Diferente de `online`, isso É espelhado no Redis (ver persistLastSeen/
	// warmup) — é histórico, não deve ser perdido a cada deploy/restart do
	// container (que na prática recria o processo com um Map vazio).
	private lastSeenAt = new Map<string, Date>();

	constructor() {
		// Não é aguardado de propósito: o processo pode começar a aceitar
		// conexões antes do warmup terminar. Só existe uma pequena janela (o
		// tempo de um SCAN no Redis) em que getLastSeenAt pode responder
		// `undefined` para alguém que na verdade tem histórico — se autocorrige
		// assim que o warmup termina ou assim que a pessoa reconectar.
		this.warmup();
	}

	private async warmup() {
		try {
			let cursor = '0';
			let restored = 0;
			do {
				const [nextCursor, keys] = await redisPub.scan(
					cursor,
					'MATCH',
					`${LAST_SEEN_KEY_PREFIX}*`,
					'COUNT',
					100,
				);
				cursor = nextCursor;
				if (keys.length > 0) {
					const values = await redisPub.mget(...keys);
					keys.forEach((key, i) => {
						const value = values[i];
						if (!value) return;
						const userId = key.slice(LAST_SEEN_KEY_PREFIX.length);
						this.lastSeenAt.set(userId, new Date(value));
						restored++;
					});
				}
			} while (cursor !== '0');
			console.log(
				chalk.magenta(
					`[${getTimestamp()}] [PresenceService] lastSeenAt reidratado do Redis: ${restored} usuário(s).`,
				),
			);
		} catch (error) {
			console.error('[PresenceService] Erro ao reidratar lastSeenAt do Redis:', error);
		}
	}

	// Fire-and-forget: não bloqueia o handler de conexão/desconexão SSE por
	// causa de uma escrita de bookkeeping no Redis.
	private persistLastSeen(userId: string, date: Date) {
		redisPub.set(`${LAST_SEEN_KEY_PREFIX}${userId}`, date.toISOString()).catch((error) => {
			console.error('[PresenceService] Erro ao persistir lastSeenAt no Redis:', error);
		});
	}

	// Chamado a cada nova conexão SSE autenticada
	addConnection(userId: string, res: Response) {
		const wasOffline = !this.online.has(userId);
		if (!this.online.has(userId)) this.online.set(userId, new Set());
		this.online.get(userId)!.add(res);

		const now = new Date();
		this.lastSeenAt.set(userId, now);
		this.persistLastSeen(userId, now);

		// só notifica os admins quando o usuário passa de 0 -> 1 conexões
		// (evita broadcast redundante quando ele já tinha outra aba aberta).
		if (wasOffline) this.broadcast({ type: 'online', userId });
	}

	// chamado no req.on('close') da conexão SSE
	removeConnection(userId: string, res: Response) {
		const conns = this.online.get(userId);
		if (!conns) return;
		conns.delete(res);

		const now = new Date();
		this.lastSeenAt.set(userId, now);
		this.persistLastSeen(userId, now);

		// só marca offline quando a ÚLTIMA aba daquele usuário fechou.
		if (conns.size === 0) {
			this.online.delete(userId);
			this.broadcast({ type: 'offline', userId });
		}
	}

	getOnlineUserIds(): string[] {
		return Array.from(this.online.keys());
	}

	isOnline(userId: string): boolean {
		return this.online.has(userId);
	}

	// Último momento em que tivemos qualquer sinal de presença do usuário
	// (conectou ou desconectou). `undefined` = nunca abriu uma conexão SSE
	// (nem antes, nem depois do restart mais recente — sobrevive a deploys
	// graças ao espelhamento em Redis feito por persistLastSeen/warmup).
	getLastSeenAt(userId: string): Date | undefined {
		return this.lastSeenAt.get(userId);
	}

	addListener(res: Response) {
		this.listeners.add(res);
	}

	removeListener(res: Response) {
		this.listeners.delete(res);
	}

	private broadcast(event: { type: 'online' | 'offline'; userId: string }) {
		if (this.listeners.size === 0) return;
		const payload = `data: ${JSON.stringify(event)}\n\n`;
		for (const client of this.listeners) {
			try {
				client.write(payload);
			} catch (error) {
				// Cliente já desconectado; será removido pelo próprio req.on('close') dele.
			}
		}
	}
}

export default new PresenceService();
