const API_URL = 'http://localhost:3001/api/emails';

// 1. Cole aqui a chave que você gerou no painel
const API_KEY = 'ea547a4302955051e0613f4120e396106f50a5471d98c969e5dd8a4689274985'; 

// 2. Coloque o seu e-mail pessoal para ver ele chegando na sua caixa de entrada
const DESTINATARIO = 'intel.spec.lopes@gmail.com'; 

async function sendPlainEmail() {
    console.log('🚀 Tentando enviar e-mail limpo (sem template)...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify({
                recipient_to: DESTINATARIO,
                subject: 'Teste de Envio Limpo - Hermes',
                body: '<h1 style="color: #4f46e5;">Funcionou!</h1><p>Este é um teste de integração de texto limpo disparado via código na API do Hermes.</p>'
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

sendPlainEmail();
