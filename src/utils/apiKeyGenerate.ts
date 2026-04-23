import crypto from 'node:crypto';
import argon2 from 'argon2';

/**
 * Utilitário centralizado para geração de API Keys do Hermes.
 * Formato: hm_[random_prefix].[random_secret]
 */
export async function generateSecureApiKey() {
	// Prefixo público para identificação rápida e indexação no banco
	const prefix = `hm_${crypto.randomBytes(4).toString('hex')}`;
	
	// Segredo aleatório de 32 bytes (64 caracteres hex)
	const secretKey = crypto.randomBytes(32).toString('hex');
	
	// Chave completa que será entregue ao usuário
	const fullApiKey = `${prefix}.${secretKey}`;

	// Hash seguro para armazenamento (Argon2 é resistente a brute-force e timing attacks)
	const keyHash = await argon2.hash(fullApiKey);

	return {
		fullApiKey,
		keyHash,
		prefix
	};
}
