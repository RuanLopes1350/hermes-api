import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitiza o HTML para evitar ataques XSS.
 * Remove scripts, eventos inline e outras tags perigosas.
 */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: { html: true },
		ADD_TAGS: ['style', 'mjml', 'mj-*'], // MJML tags se necessário, mas aqui já é HTML final
		ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'class', 'id'],
	});
}
