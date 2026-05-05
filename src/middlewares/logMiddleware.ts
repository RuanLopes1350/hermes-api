import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/dbConfig.js';
import { logs } from '../config/db/schema.js';

/**
 * Middleware global para persistência de logs de auditoria no banco de dados.
 * Captura detalhes da requisição após a finalização da resposta.
 */
export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
	// Interceptamos o evento 'finish' para garantir que temos o status_code final
	res.on('finish', async () => {
		try {
			// Ignora logs de health check para não poluir o banco
			if (req.originalUrl === '/api/health' || req.originalUrl === '/') return;

			await db.insert(logs).values({
				id: uuidv4(),
				method: req.method,
				status_code: res.statusCode,
				endpoint: req.originalUrl,
				ip_address: req.ip || req.socket.remoteAddress || null,
				// Identificadores injetados pelos middlewares de autenticação
				api_key_id: (req as any).apiKeyId || null,
				user_id: (req as any).user?.id || null,
			});
		} catch (error) {
			// Falha silenciosa no log para não quebrar a requisição principal do usuário
			console.error('[DATABASE_LOG_ERROR] Falha ao persistir log no banco:', error);
		}
	});

	next();
};
