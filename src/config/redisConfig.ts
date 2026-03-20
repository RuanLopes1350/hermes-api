import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const redisConfig: ConnectionOptions = {
	host: process.env.REDIS_HOST || 'localhost',
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.REDIS_PASSWORD || undefined,
};
