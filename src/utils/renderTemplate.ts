import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import chalk from 'chalk';
import { getTimestamp } from './helpers/dateUtils.js';

// Utilitário para renderizar templates do Hermes.
// Realiza a transpilação de MJML para HTML e a injeção de variáveis via Handlebars.

// Aceita a fonte MJML crua (compila na hora) ou uma função Handlebars já compilada
// (ver templateCache.ts) — evita recompilar o mesmo template em envios em massa/repetidos.
export async function renderTemplate(
	mjmlSource: string | Handlebars.TemplateDelegate,
	variables: Record<string, any> = {},
) {
	try {
		// 1. Injeta as variáveis no MJML usando Handlebars
		// Isso permite usar variáveis dentro de tags MJML (ex: <mj-text>{{nome}}</mj-text>)
		const template = typeof mjmlSource === 'string' ? Handlebars.compile(mjmlSource) : mjmlSource;
		const mjmlWithVars = template(variables);

		// 2. Transpila o MJML para HTML puro compatível com clientes de e-mail
		// mjml2html é síncrono na v4.x
		const result = await mjml2html(mjmlWithVars, {
			validationLevel: 'soft',
			// minify: true,
		});

		const { html, errors } = result;

		if (errors && errors.length > 0) {
			console.warn(
				chalk.yellow(
					`[${getTimestamp()}] [RENDER] MJML com avisos:`,
					errors.map((e: any) => e.message).join(', '),
				),
			);
		}

		return {
			html,
			// Não usamos e.formattedMessage: ele embute o path absoluto do servidor
			// (ex: /home/usuario/projeto/hermes-api), vazando estrutura de arquivos
			// da máquina para quem só está editando um template no navegador.
			errors: errors ? errors.map((e: any) => `Linha ${e.line} (${e.tagName}) — ${e.message}`) : [],
		};
	} catch (error: any) {
		console.error(
			chalk.red.bold(`[${getTimestamp()}] [ERROR] [renderTemplate] Erro crítico:`),
			error,
		);
		throw new Error(`Falha ao renderizar template: ${error.message}`);
	}
}
