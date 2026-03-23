import chalk from 'chalk';
import { getTimestamp } from '../utils/helpers/dateUtils.js';
import logRepository from '../repository/logRepository.js';
import HttpStatusCode from '../utils/helpers/httpStatusCode.js';
import { DomainError } from '../utils/helpers/domainError.js';

// Erro de domínio para logs
export class LogDomainError extends DomainError {
	constructor(message: string, statusCode: number, errorCode: string) {
		super(message, statusCode, errorCode);
		this.name = 'LogDomainError';
	}
}

// Limite máximo de registros por página para evitar sobrecarga
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

class LogService {
	// Lista logs com paginação.
	// Acesso restrito a administradores (verificação no controller via req.user.isAdmin).
	//
	async listLogs(limit?: number, offset?: number) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [LogService] Listando logs...`));

		// Aplica limites de segurança para paginação
		const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
		const safeOffset = Math.max(offset ?? 0, 0);

		return logRepository.findAll(safeLimit, safeOffset);
	}

	// Busca um log por ID.
	//
	async getLog(logId: string) {
		console.log(chalk.blue.bold(`[${getTimestamp()}] [INFO] [LogService] Buscando log: ${logId}`));

		const found = await logRepository.findById(logId);
		if (!found) {
			throw new LogDomainError(
				'Log não encontrado.',
				HttpStatusCode.NOT_FOUND.code,
				'LOG_NOT_FOUND',
			);
		}
		return found;
	}
}

export default new LogService();
