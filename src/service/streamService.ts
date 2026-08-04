import { EventEmitter } from 'events';
import { redisSub } from '../config/redisConfig.js';

class StreamService {
	public emitter = new EventEmitter();

	constructor() {
		// Psubscribe to all email-status channels
		redisSub.psubscribe('email-status:*', (err) => {
			if (err) console.error('[StreamService] Error subscribing to redis:', err);
			else console.log('[StreamService] Subscribed to email-status:*');
		});

		redisSub.on('pmessage', (pattern, channel, message) => {
			this.emitter.emit(channel, message);
		});
	}
}

export default new StreamService();
