import { db } from '../config/dbConfig';
import { api_key } from '../config/db/schema';
import { ApiKeyType } from '../types/types';
import { parseDatabaseError } from '../utils/helpers/dbErrors';
import chalk from 'chalk';

class ApiKeyRepository {
	private db: typeof db;

    constructor() {
        this.db = db;
    }

    async createApiKey(apiKey: ApiKeyType & { id: string }): Promise<ApiKeyType> {
        console.log(
            chalk.blue.bold(
                '[ApiKeyRepository] [createApiKey] Gravando nova chave de API no banco de dados...',
            ),
        );

        try {
            const response = await this.db
                .insert(api_key)
                .values({
                    id: apiKey.id,
                    name: apiKey.name,
                    key_hash: apiKey.key_hash,
                    prefix: apiKey.prefix,
                    service_id: apiKey.service_id,
                    is_active: apiKey.is_active,
                    last_used_at: apiKey.last_used_at ?? null,
                })
                .returning();

            return {
                ...response[0],
                last_used_at: response[0].last_used_at ?? undefined,
            };
        } catch (error) {
            const parsedError = parseDatabaseError(error, 'Erro ao criar API key');
            console.error(chalk.red.bold('[ApiKeyRepository] [createApiKey] Erro ao criar API key:'), parsedError);
            throw parsedError;
        }
    }
}

export default ApiKeyRepository;
