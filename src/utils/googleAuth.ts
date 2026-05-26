import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Utilitário para gerenciamento dinâmico de autenticação Google OAuth2.
// Permite que cada credencial no Hermes use seu próprio App do Google Cloud.

// Cria uma instância do cliente OAuth2 do Google com credenciais dinâmicas.
export function createDynamicOAuth2Client(clientId: string, clientSecret: string) {
	const redirectUri = `${process.env.AUTH_BASE_URL || 'http://localhost:3001'}/api/callback/google/gmail`;
	
	console.log(`[GoogleAuth] Gerando cliente com Redirect URI: ${redirectUri}`);
	
	return new google.auth.OAuth2(
		clientId,
		clientSecret,
		redirectUri,
	);
}

// Gera a URL de autorização para o usuário conceder permissão de envio de e-mail.
export function getAuthUrl(clientId: string, clientSecret: string, state: string) {
	const client = createDynamicOAuth2Client(clientId, clientSecret);

	return client.generateAuthUrl({
		access_type: 'offline',
		scope: ['https://mail.google.com/'], // Escopo obrigatório para SMTP XOAUTH2
		prompt: 'consent',
		state: state,
	});
}

// Troca o código de autorização recebido no callback pelos tokens (Access e Refresh).
export async function getTokensFromCode(clientId: string, clientSecret: string, code: string) {
	const client = createDynamicOAuth2Client(clientId, clientSecret);
	const { tokens } = await client.getToken(code);
	return tokens;
}
