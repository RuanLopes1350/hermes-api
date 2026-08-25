import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const emailApiRateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minuto
	max: 100, // limite de 100 requisições por API Key
	// Se houver apiKeyId, usamos ele. Caso contrário, usamos o helper oficial
	// ipKeyGenerator, que trata corretamente IPv6 (evita o erro ERR_ERL_KEY_GEN_IPV6).
	keyGenerator: (req) => {
		if (req.credentialId) return `apikey:${req.credentialId}`;
		return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
	},
	skip: (req) => !req.credentialId && !req.ip,
	message: 'Muitas requisições de e-mail a partir desta API Key. Tente novamente em um minuto.',
	standardHeaders: true,
	legacyHeaders: false,
});

export const templateApiRateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minuto
	max: 20, // limite de 20 requisições por usuário para operações pesadas
	keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`,
	message: 'Muitas requisições de template. Tente novamente em um minuto.',
	standardHeaders: true,
	legacyHeaders: false,
});

export const authApiRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 10, // limite de 10 requisições
	keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`,
	message: 'Muitas tentativas de cadastro ou autenticação. Tente novamente mais tarde.',
	standardHeaders: true,
	legacyHeaders: false,
});
