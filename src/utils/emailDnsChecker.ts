import dns from 'node:dns/promises';
import type { MxRecord } from 'node:dns';
import chalk from 'chalk';
import { z } from 'zod';
import { getTimestamp } from './helpers/dateUtils.js';

// Schema do Zod v4 para validação de e-mail direto
const emailSchema = z.email('Informe um endereço de e-mail válido!');

export interface EmailDomainCheckResult {
	email: string;
	valid: boolean;
	domain: string;
	mxRecords?: MxRecord[];
	reason?: string;
}

// Consulta registros MX de um domínio no DNS com cache local
async function resolveMxWithDetails(domain: string): Promise<{
	valid: boolean;
	mxRecords?: MxRecord[];
	reason?: string;
}> {
	console.log(
		chalk.blue(`[${getTimestamp()}] [EMAIL-DNS] Consultando registros MX para: ${domain}`),
	);

	try {
		const records = await dns.resolveMx(domain);

		if (!records || records.length === 0) {
			console.warn(
				chalk.yellow(
					`[${getTimestamp()}] [EMAIL-DNS] Domínio "${domain}" não possui registros MX configurados!`,
				),
			);
			return {
				valid: false,
				reason: 'O domínio não possui servidores de e-mail (registros MX) configurados!',
			};
		}

		// Ordena registros por prioridade (menor valor = maior prioridade)
		const sortedRecords = records.sort((a, b) => a.priority - b.priority);

		console.log(
			chalk.green(
				`[${getTimestamp()}] [EMAIL-DNS] Domínio "${domain}" válido (${sortedRecords.length} registro(s) MX encontrado(s))!`,
			),
		);

		return {
			valid: true,
			mxRecords: sortedRecords,
		};
	} catch (error: any) {
		let reason = 'Falha ao resolver registros DNS do domínio.';

		if (error.code === 'ENOTFOUND') {
			reason = 'O domínio especificado não existe ou não foi encontrado no DNS.';
		} else if (error.code === 'ENODATA') {
			reason = 'O domínio existe, mas não possui registros MX (servidores de e-mail).';
		} else if (error.code === 'ETIMEOUT') {
			reason = 'Tempo limite esgotado ao consultar os servidores DNS do domínio.';
		}

		console.error(
			chalk.red(
				`[${getTimestamp()}] [EMAIL-DNS] Erro ao consultar MX para "${domain}" (${error.code || 'UNKNOWN'}): ${error.message}`,
			),
		);

		return {
			valid: false,
			reason,
		};
	}
}

// Assinaturas de sobrecarga (Overloads) para o TypeScript inferir o tipo exato de retorno
export async function emailDomainCheck(email: string): Promise<EmailDomainCheckResult>;
export async function emailDomainCheck(emails: string[]): Promise<EmailDomainCheckResult[]>;

// Valida o formato de e-mail(s) e verifica a existência de registros MX ativos no DNS.
// Suporta tanto um único e-mail (string) quanto múltiplos (string[] para envios bulk)
export async function emailDomainCheck(
	emailOrEmails: string | string[],
): Promise<EmailDomainCheckResult | EmailDomainCheckResult[]> {
	const isSingle = !Array.isArray(emailOrEmails);
	const emailList = isSingle ? [emailOrEmails] : emailOrEmails;

	// Cache de domínios para evitar consultas repetidas ao DNS no mesmo lote (ex: múltiplos @gmail.com)
	const domainCache = new Map<
		string,
		{ valid: boolean; mxRecords?: MxRecord[]; reason?: string }
	>();

	const results: EmailDomainCheckResult[] = [];

	for (const rawEmail of emailList) {
		const currentEmail = (rawEmail || '').trim();

		// 1. Validação de formato via Zod v4
		const parseResult = emailSchema.safeParse(currentEmail);
		if (!parseResult.success) {
			const errorMessage = parseResult.error?.message || 'E-mail inválido!';
			console.warn(
				chalk.yellow(
					`[${getTimestamp()}] [EMAIL-DNS] Formato inválido para "${currentEmail}": ${errorMessage}`,
				),
			);
			results.push({
				email: currentEmail,
				valid: false,
				domain: '',
				reason: errorMessage,
			});
			continue;
		}

		// 2. Extração do domínio
		const domain = currentEmail.split('@')[1]?.toLowerCase().trim();
		if (!domain) {
			results.push({
				email: currentEmail,
				valid: false,
				domain: '',
				reason: 'Não foi possível extrair o domínio do e-mail!',
			});
			continue;
		}

		// 3. Consulta de DNS (com reaproveitamento de cache)
		if (!domainCache.has(domain)) {
			const dnsResult = await resolveMxWithDetails(domain);
			domainCache.set(domain, dnsResult);
		}

		const cachedResult = domainCache.get(domain)!;

		results.push({
			email: currentEmail,
			valid: cachedResult.valid,
			domain,
			mxRecords: cachedResult.mxRecords,
			reason: cachedResult.reason,
		});
	}

	// Retorna o objeto direto se foi passado string, ou o array se foi passado string[]
	return isSingle ? results[0] : results;
}
