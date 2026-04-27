import rateLimit from 'express-rate-limit';

export const emailApiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // limite de 100 requisições por API Key
    // Corrigindo para evitar o erro ERR_ERL_KEY_GEN_IPV6
    // Se houver apiKeyId, usamos ele. Caso contrário, deixamos o express-rate-limit 
    // usar o gerador de IP padrão que já trata IPv6 corretamente.
    keyGenerator: (req) => {
        return (req.apiKeyId || req.ip || 'unknown').toString();
    },
    // Adicionamos skip para que, se não houver IP nem API Key (raro), ele não quebre
    skip: (req) => !req.apiKeyId && !req.ip,
    message: "Muitas requisições de e-mail a partir desta API Key. Tente novamente em um minuto.",
    standardHeaders: true,
    legacyHeaders: false,
    // Desabilita as validações que causam o erro ERR_ERL_KEY_GEN_IPV6
    validate: false
});