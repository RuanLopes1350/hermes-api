const API_URL = 'https://api.hermes.qa.fslab.dev/api/emails';

// 1. Cole aqui a chave que você gerou no painel
const API_KEY = '850a9ba2682f7211bf45c2cf687b5c21ca35d4600a49c74b0222c40486dc22b2'; 

// 2. Coloque o seu e-mail pessoal para ver ele chegando na sua caixa de entrada
const DESTINATARIO = 'intel.spec.lopes@gmail.com'; 

// 3. Cole o ID do Template que você montou no painel
const TEMPLATE_ID = 'c8c96799-6568-4977-8d15-b369a441fcff'; 

async function sendTemplateEmail() {
    console.log('🚀 Tentando enviar e-mail com Template MJML/Handlebars...');
    
    if (TEMPLATE_ID.includes('COLE_O_ID')) {
        console.log('⚠️ AVISO: Edite este arquivo e informe o TEMPLATE_ID na linha 10!');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify({
                recipient_to: DESTINATARIO,
                subject: 'Teste com Template - Hermes',
                template_id: TEMPLATE_ID,
                variables: {
                    nome_sistema: 'Spotter',
                    nome_usuario: 'Ruan Lopes',
                    tempo_expiracao: '30 minutos',
                    link_recuperacao: 'https://hermes.qa.fslab.dev/',
                }
            }),
        });

        const data = await response.json();
        console.log(`📡 Status HTTP: ${response.status}`);
        console.dir(data, { depth: null });
        console.log('-----------------------------------------------------\n');
    } catch (error) {
        console.error('❌ Erro de rede ou indisponibilidade:', error);
    }
}

sendTemplateEmail();
