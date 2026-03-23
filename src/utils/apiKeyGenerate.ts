import crypto from 'node:crypto';

async function generateApiKey(prefix: string) {
	const raw = crypto.randomBytes(32).toString('base64url'); // Gera uma string aleatória de 32 bytes e a codifica em base64url
	const key = `${prefix}_${raw}`; // Adiciona o prefixo à chave gerada
	const hashedKey = crypto.createHash('sha256').update(key).digest('hex'); // Hash da chave usando SHA-256
	return { key, hashedKey }; // Retorna a chave original e a chave hash
}

export default generateApiKey;
