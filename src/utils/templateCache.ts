import Handlebars from 'handlebars';
import templateRepository from '../repository/templateRepository.js';

const CACHE_TTL_MS = 60_000;

type TemplateRow = NonNullable<Awaited<ReturnType<typeof templateRepository.findById>>>;

export interface CachedTemplate {
	tmpl: TemplateRow;
	htmlCompiledFn: Handlebars.TemplateDelegate;
	subjectCompiledFn: Handlebars.TemplateDelegate | null;
	expiresAt: number;
}

const cache = new Map<string, CachedTemplate>();

// Cache em memória (por processo) do worker de e-mails: evita ida ao banco e recompilação
// Handlebars pra cada e-mail de um mesmo template (ex: envio em massa). TTL curto pra
// limitar o quanto uma edição de template no meio de um burst de envios pode ficar defasada.
export async function getCachedTemplate(templateId: string): Promise<CachedTemplate | null> {
	const cached = cache.get(templateId);
	if (cached && cached.expiresAt > Date.now()) {
		return cached;
	}

	const tmpl = await templateRepository.findById(templateId);
	if (!tmpl) {
		cache.delete(templateId);
		return null;
	}

	const entry: CachedTemplate = {
		tmpl,
		htmlCompiledFn: Handlebars.compile(tmpl.html_content || ''),
		subjectCompiledFn: tmpl.subject_template ? Handlebars.compile(tmpl.subject_template) : null,
		expiresAt: Date.now() + CACHE_TTL_MS,
	};
	cache.set(templateId, entry);
	return entry;
}
