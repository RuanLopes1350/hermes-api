import rateLimit from 'express-rate-limit';

export const emailApiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // limite de 100 requisições por API Key
    keyGenerator: (req) => (req.apiKeyId || req.ip || 'unknown') as string, // Baseia o limite no ID da chave autenticada (injetado pelo middleware)
    message: "Muitas requisições de e-mail a partir desta API Key. Tente novamente em um minuto.",
    standardHeaders: true,
    legacyHeaders: false,
});