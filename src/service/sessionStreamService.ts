import { EventEmitter } from 'events';
import { redisSub } from '../config/redisConfig.js';

class SessionStreamService {
	public emitter = new EventEmitter();

	constructor() {
		// Psubscribe a todos os canais de invalidação de sessão (session:revoked:<userId>)
		redisSub.psubscribe('session:revoked:*', (err) => {
			if (err) console.error('[SessionStreamService] Error subscribing to redis:', err);
			else console.log('[SessionStreamService] Subscribed to session:revoked:*');
		});

		redisSub.on('pmessage', (pattern, channel, message) => {
			this.emitter.emit(channel, message);
		});
	}
}

export default new SessionStreamService();
