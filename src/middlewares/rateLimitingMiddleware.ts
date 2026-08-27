import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Chaveia por usuário autenticado quando disponível (requireAuth roda antes do
// limiter nessas rotas). Cai para IP só se não houver sessão — evita que vários
// usuários atrás do mesmo IP/NAT dividam uma única cota.
function keyByUserOrIp(req: Request): string {
	if (req.user?.id) return `user:${req.user.id}`;
	return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

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

// Leitura e preview: o editor de templates dispara isso automaticamente (a cada
// keystroke com debounce, e a cada vez que a tela é aberta), então precisa de
// uma cota bem mais folgada do que uma operação de escrita real.
export const templateReadRateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minuto
	max: 300,
	keyGenerator: keyByUserOrIp,
	message: 'Muitas requisições de leitura/preview de template. Tente novamente em instantes.',
	standardHeaders: true,
	legacyHeaders: false,
});

// Escrita (criar/editar/excluir): mantém uma cota mais conservadora.
export const templateWriteRateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minuto
	max: 30,
	keyGenerator: keyByUserOrIp,
	message: 'Muitas requisições de escrita de template. Tente novamente em um minuto.',
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
