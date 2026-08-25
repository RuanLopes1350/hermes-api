import { Response } from 'express';

class PresenceService {
	// userId -> conexões SSE abertas daquele usuário (uma por aba/dispositivo)
	private online = new Map<string, Set<Response>>();
	// conexões de admins observando o painel de presença em tempo real
	private listeners = new Set<Response>();

	// Chamado a cada nova conexão SSE autenticada
	addConnection(userId: string, res: Response) {
		const wasOffline = !this.online.has(userId);
		if (!this.online.has(userId)) this.online.set(userId, new Set());
		this.online.get(userId)!.add(res);

		// só notifica os admins quando o usuário passa de 0 -> 1 conexões
		// (evita broadcast redundante quando ele já tinha outra aba aberta).
		if (wasOffline) this.broadcast({ type: 'online', userId });
	}

	// chamado no req.on('close') da conexão SSE
	removeConnection(userId: string, res: Response) {
		const conns = this.online.get(userId);
		if (!conns) return;
		conns.delete(res);

		// só marca offline quando a ÚLTIMA aba daquele usuário fechou.
		if (conns.size === 0) {
			this.online.delete(userId);
			this.broadcast({ type: 'offline', userId });
		}
	}

	getOnlineUserIds(): string[] {
		return Array.from(this.online.keys());
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
