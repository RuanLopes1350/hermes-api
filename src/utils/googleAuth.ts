import { google } from 'googleapis';

// Utilitário para gerenciamento dinâmico de autenticação Google OAuth2.
//Permite que cada credencial no Hermes use seu próprio App do Google Cloud.

// Cria uma instância do cliente OAuth2 do Google com credenciais dinâmicas.
export function createDynamicOAuth2Client(clientId: string, clientSecret: string) {
	return new google.auth.OAuth2(
		clientId,
		clientSecret,
		`${process.env.AUTH_BASE_URL}/api/auth/google/callback`,
	);
}

// Gera a URL de autorização para o usuário conceder permissão de envio de e-mail.
// O parâmetro 'state' deve conter o ID da credencial para vincular no callback.

export function getAuthUrl(clientId: string, clientSecret: string, state: string) {
	const client = createDynamicOAuth2Client(clientId, clientSecret);

	return client.generateAuthUrl({
		access_type: 'offline', // Importante para obter o Refresh Token
		scope: ['https://www.googleapis.com/auth/gmail.send'],
		prompt: 'consent', // Força a exibição da tela de consentimento para garantir o refresh token
		state: state,
	});
}

// Troca o código de autorização recebido no callback pelos tokens (Access e Refresh).
export async function getTokensFromCode(clientId: string, clientSecret: string, code: string) {
	const client = createDynamicOAuth2Client(clientId, clientSecret);
	const { tokens } = await client.getToken(code);
	return tokens;
}
