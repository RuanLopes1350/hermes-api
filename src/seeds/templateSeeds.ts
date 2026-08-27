import { db } from '../config/dbConfig.js';
import { template, template_log } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import mjml2html from 'mjml';
import { daysAgo } from './seedHelpers.js';

export async function seedTemplates(users: any[], services: any[]) {
	const [adminUser] = users;

	const templatesRaw = [
		// Globais
		{
			id: uuidv4(),
			name: 'Template de Boas Vindas',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Bem-vindo ao {{companyName}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Bem-vindo(a) ao {{nome_sistema}}!</mj-title>
    <mj-preview>Sua conta foi criada com sucesso. Veja como começar.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" color="#333333" line-height="24px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #888888 !important; text-align: center; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f4f5f7">

    <!-- Espaçamento superior -->
    <mj-section padding-bottom="20px"></mj-section>

    <!-- Cartão Principal -->
    <mj-section background-color="#ffffff" padding="40px 20px" border-radius="8px" box-shadow="0 4px 6px rgba(0,0,0,0.05)">
      <mj-column>

        <!-- Cabeçalho / Logo (Opcional) -->
        <mj-text font-size="24px" font-weight="bold" color="#2c3e50" align="center" padding-bottom="20px">
          {{nome_sistema}}
        </mj-text>

        <mj-divider border-color="#eeeeee" border-width="1px" padding-bottom="20px" />

        <!-- Mensagem de Boas-vindas -->
        <mj-text font-size="20px" font-weight="bold" color="#2c3e50">
          Olá, {{nome_usuario}}!
        </mj-text>

        <mj-text>
          Estamos muito felizes em ter você conosco. Sua conta no <strong>{{nome_sistema}}</strong> foi criada com sucesso e já está pronta para uso.
        </mj-text>

        <mj-text>
          Para começar a explorar nossos recursos e configurar o seu perfil, basta clicar no botão abaixo:
        </mj-text>

        <!-- Call to Action (CTA) -->
        <mj-button background-color="#3498db" color="#ffffff" font-size="16px" font-weight="bold" border-radius="4px" href="{{link_acesso}}" padding="20px 0">
          Acessar Minha Conta
        </mj-button>

        <mj-text>
          Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:<br/>
          <a href="{{link_acesso}}" style="color: #3498db; word-break: break-all;">{{link_acesso}}</a>
        </mj-text>

        <mj-text padding-top="20px">
          Se você tiver qualquer dúvida ou precisar de ajuda, nossa equipe de suporte está à disposição.
        </mj-text>

        <mj-text>
          Um abraço,<br/>
          <strong>Equipe {{nome_sistema}}</strong>
        </mj-text>

      </mj-column>
    </mj-section>

    <!-- Rodapé -->
    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Você está recebendo este e-mail porque se cadastrou no {{nome_sistema}}.<br/>
          © 2026 {{nome_sistema}}. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>`,
			text_content: 'Olá {{name}}, bem-vindo ao sistema global!',
			createdAt: daysAgo(90),
		},
		{
			id: uuidv4(),
			name: 'Recibo de Compra Global',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Seu Recibo Universal #{{orderId}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Recibo #{{orderId}}</mj-title>
    <mj-preview>O comprovante do seu pagamento está pronto.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" color="#333333" line-height="24px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #888888 !important; text-align: center; }
      .receipt-label { font-size: 12px !important; color: #888888 !important; text-transform: uppercase; letter-spacing: 0.05em; }
      .receipt-value { font-size: 14px !important; color: #2c3e50 !important; font-weight: bold; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f4f5f7">
    <mj-section padding-bottom="20px"></mj-section>

    <mj-section background-color="#ffffff" padding="40px 20px 24px" border-radius="8px 8px 0 0" box-shadow="0 4px 6px rgba(0,0,0,0.05)">
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" color="#2c3e50" align="center">
          Recibo de Pagamento
        </mj-text>
        <mj-text align="center" color="#888888" font-size="14px">
          Pedido #{{orderId}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 20px">
      <mj-column>
        <mj-divider border-color="#eeeeee" border-width="1px" />
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="20px">
      <mj-column width="50%">
        <mj-text css-class="receipt-label" padding-bottom="2px">Data</mj-text>
        <mj-text css-class="receipt-value" padding-bottom="16px">{{purchaseDate}}</mj-text>
        <mj-text css-class="receipt-label" padding-bottom="2px">Forma de Pagamento</mj-text>
        <mj-text css-class="receipt-value">{{paymentMethod}}</mj-text>
      </mj-column>
      <mj-column width="50%">
        <mj-text css-class="receipt-label" padding-bottom="2px">Status</mj-text>
        <mj-text css-class="receipt-value" color="#27ae60" padding-bottom="16px">Aprovado</mj-text>
        <mj-text css-class="receipt-label" padding-bottom="2px">Total Cobrado</mj-text>
        <mj-text font-size="20px" font-weight="bold" color="#2c3e50">{{amount}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 20px 40px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-divider border-color="#eeeeee" border-width="1px" padding-bottom="20px" />
        <mj-button background-color="#2c3e50" color="#ffffff" font-size="16px" font-weight="bold" border-radius="4px" href="{{receiptUrl}}">
          Baixar Recibo em PDF
        </mj-button>
        <mj-text align="center" font-size="12px" color="#aaaaaa" padding-top="16px">
          Guarde este comprovante para fins fiscais.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Recibo emitido automaticamente. Em caso de dúvidas, entre em contato com o suporte.<br/>
          © 2026 {{nome_sistema}}. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Recibo de Pagamento — Pedido #{{orderId}}\nData: {{purchaseDate}}\nForma de pagamento: {{paymentMethod}}\nStatus: Aprovado\nTotal cobrado: {{amount}}\nBaixe o PDF em: {{receiptUrl}}',
			createdAt: daysAgo(88),
		},
		{
			id: uuidv4(),
			name: 'Recuperação de Senha',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Recupere sua senha, {{name}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Recuperação de Senha - {{nome_sistema}}</mj-title>
    <mj-preview>Instruções para redefinir sua senha de acesso.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" color="#333333" line-height="24px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #888888 !important; text-align: center; }
      .alert-text { color: #e74c3c !important; font-size: 14px !important; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f4f5f7">

    <mj-section padding-bottom="20px"></mj-section>

    <!-- Cartão Principal -->
    <mj-section background-color="#ffffff" padding="40px 20px" border-radius="8px" box-shadow="0 4px 6px rgba(0,0,0,0.05)">
      <mj-column>

        <mj-text font-size="24px" font-weight="bold" color="#2c3e50" align="center" padding-bottom="20px">
          {{nome_sistema}}
        </mj-text>

        <mj-divider border-color="#eeeeee" border-width="1px" padding-bottom="20px" />

        <mj-text font-size="20px" font-weight="bold" color="#2c3e50">
          Olá, {{nome_usuario}},
        </mj-text>

        <mj-text>
          Recebemos uma solicitação para redefinir a senha associada à sua conta no <strong>{{nome_sistema}}</strong>.
        </mj-text>

        <mj-text>
          Para escolher uma nova senha, clique no botão abaixo. Este link é válido por <strong>{{tempo_expiracao}}</strong>.
        </mj-text>

        <!-- Call to Action (CTA) -->
        <mj-button background-color="#e67e22" color="#ffffff" font-size="16px" font-weight="bold" border-radius="4px" href="{{link_recuperacao}}" padding="20px 0">
          Redefinir Minha Senha
        </mj-button>

        <mj-text>
          Ou copie e cole o link no seu navegador:<br/>
          <a href="{{link_recuperacao}}" style="color: #e67e22; word-break: break-all;">{{link_recuperacao}}</a>
        </mj-text>

        <mj-text css-class="alert-text" padding-top="20px">
          <strong>Atenção:</strong> Se você não solicitou a alteração de senha, ignore este e-mail. Sua senha atual permanecerá a mesma e sua conta continuará segura.
        </mj-text>

      </mj-column>
    </mj-section>

    <!-- Rodapé -->
    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Este é um e-mail automático, por favor, não responda.<br/>
          © 2026 {{nome_sistema}}. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>`,
			text_content: 'Clique no link para resetar sua senha: {{resetLink}}',
			createdAt: daysAgo(86),
		},

		// ===== Service E-commerce API (index 0) =====
		{
			id: uuidv4(),
			name: 'Confirmação de Pedido',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Pedido Confirmado #{{orderId}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Pedido Confirmado #{{orderId}}</mj-title>
    <mj-preview>Recebemos seu pedido e já estamos preparando o envio.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#334155" line-height="22px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #94a3b8 !important; text-align: center; }
      .item-name { font-size: 14px !important; color: #1e293b !important; }
      .item-price { font-size: 14px !important; color: #1e293b !important; font-weight: bold; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f1f5f9">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#2563eb" padding="28px 20px" border-radius="8px 8px 0 0">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#ffffff" align="center">
          Pedido Confirmado ✓
        </mj-text>
        <mj-text align="center" color="#dbeafe" font-size="14px" padding-top="4px">
          #{{orderId}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="28px 24px 12px">
      <mj-column>
        <mj-text>
          Olá! Recebemos o seu pedido e ele já está sendo preparado para envio. Você vai receber uma nova
          mensagem assim que ele sair para entrega.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px">
      <mj-column>
        <mj-divider border-color="#e2e8f0" border-width="1px" padding-bottom="12px" />
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px">
      <mj-column width="70%">
        <mj-text css-class="item-name">{{itemNome}}</mj-text>
        <mj-text font-size="12px" color="#94a3b8">Quantidade: {{itemQtd}}</mj-text>
      </mj-column>
      <mj-column width="30%">
        <mj-text css-class="item-price" align="right">{{itemPreco}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="12px 24px 24px">
      <mj-column>
        <mj-divider border-color="#e2e8f0" border-width="1px" padding-bottom="12px" />
      </mj-column>
      <mj-column width="70%">
        <mj-text font-size="15px" font-weight="bold" color="#1e293b">Total</mj-text>
      </mj-column>
      <mj-column width="30%">
        <mj-text font-size="16px" font-weight="bold" color="#2563eb" align="right">{{orderTotal}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-text font-size="12px" color="#94a3b8" padding-bottom="4px" text-transform="uppercase">
          Endereço de Entrega
        </mj-text>
        <mj-text font-size="14px" color="#334155">{{enderecoEntrega}}</mj-text>
        <mj-button background-color="#2563eb" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_pedido}}" padding="24px 0 0">
          Acompanhar Meu Pedido
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Dúvidas sobre seu pedido? Responda este e-mail que nossa equipe te ajuda.<br/>
          © 2026 E-commerce API. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Pedido Confirmado #{{orderId}}\n\nItem: {{itemNome}} (x{{itemQtd}}) — {{itemPreco}}\nTotal: {{orderTotal}}\nEntrega: {{enderecoEntrega}}\n\nAcompanhe em: {{link_pedido}}',
			createdAt: daysAgo(82),
		},
		{
			id: uuidv4(),
			name: 'Envio Rastreio',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Seu pacote está a caminho',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Seu pacote está a caminho</mj-title>
    <mj-preview>Código de rastreio {{trackingCode}} — acompanhe a entrega.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#334155" line-height="22px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #94a3b8 !important; text-align: center; }
      .step-done { font-size: 12px !important; color: #0ea5e9 !important; font-weight: bold; }
      .step-pending { font-size: 12px !important; color: #cbd5e1 !important; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f0f9ff">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#ffffff" padding="32px 24px 16px" border-radius="8px 8px 0 0" box-shadow="0 4px 6px rgba(0,0,0,0.04)">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#0c4a6e" align="center">
          📦 Seu pedido está a caminho
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#0ea5e9" text-transform="uppercase" letter-spacing="0.08em">
          Código de Rastreio
        </mj-text>
        <mj-text align="center" font-size="26px" font-weight="bold" color="#0c4a6e" padding-top="4px">
          {{trackingCode}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="24px">
      <mj-column width="33.3%">
        <mj-text css-class="step-done" align="center">✓ Confirmado</mj-text>
      </mj-column>
      <mj-column width="33.3%">
        <mj-text css-class="step-done" align="center">● Em Trânsito</mj-text>
      </mj-column>
      <mj-column width="33.3%">
        <mj-text css-class="step-pending" align="center">○ Entregue</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-divider border-color="#e0f2fe" border-width="1px" padding-bottom="16px" />
        <mj-text align="center">
          Previsão de entrega: <strong>{{previsaoEntrega}}</strong> via {{transportadora}}
        </mj-text>
        <mj-button background-color="#0ea5e9" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_rastreio}}" padding="20px 0 0">
          Rastrear Pacote em Tempo Real
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          O prazo pode variar conforme a transportadora.<br/>
          © 2026 E-commerce API. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Seu pedido está a caminho!\nRastreio: {{trackingCode}}\nTransportadora: {{transportadora}}\nPrevisão de entrega: {{previsaoEntrega}}\n\nAcompanhe em: {{link_rastreio}}',
			createdAt: daysAgo(80),
		},

		// ===== Service Marketing Newsletter (index 1) =====
		{
			id: uuidv4(),
			name: 'Newsletter Semanal',
			service_id: services[1].id,
			creator_id: services[1].creator_id,
			global: false,
			subject_template: 'Novidades da Semana',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Novidades da Semana</mj-title>
    <mj-preview>3 destaques que separamos pra você esta semana.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Georgia, 'Times New Roman', serif" />
      <mj-text font-size="15px" color="#3f3f46" line-height="22px" font-family="Helvetica, Arial, sans-serif" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 11px !important; color: #a1a1aa !important; text-align: center; font-family: Helvetica, Arial, sans-serif; }
      .highlight-title { font-size: 15px !important; font-weight: bold; color: #581c87 !important; font-family: Helvetica, Arial, sans-serif; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#faf5ff">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#581c87" padding="36px 24px" border-radius="8px 8px 0 0">
      <mj-column>
        <mj-text font-size="26px" font-weight="bold" color="#ffffff" align="center">
          Novidades da Semana
        </mj-text>
        <mj-text align="center" color="#e9d5ff" font-size="13px" padding-top="6px">
          Edição de {{dataEdicao}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="28px 24px 8px">
      <mj-column>
        <mj-text font-size="16px">
          Separamos três destaques desta semana pra você não perder nada do que está rolando por aqui.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="12px 24px">
      <mj-column width="10%" vertical-align="top">
        <mj-text font-size="20px">🚀</mj-text>
      </mj-column>
      <mj-column width="90%">
        <mj-text css-class="highlight-title">{{destaque1_titulo}}</mj-text>
        <mj-text font-size="13px" color="#71717a">{{destaque1_resumo}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="12px 24px">
      <mj-column width="10%" vertical-align="top">
        <mj-text font-size="20px">💡</mj-text>
      </mj-column>
      <mj-column width="90%">
        <mj-text css-class="highlight-title">{{destaque2_titulo}}</mj-text>
        <mj-text font-size="13px" color="#71717a">{{destaque2_resumo}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="12px 24px 28px">
      <mj-column width="10%" vertical-align="top">
        <mj-text font-size="20px">🎯</mj-text>
      </mj-column>
      <mj-column width="90%">
        <mj-text css-class="highlight-title">{{destaque3_titulo}}</mj-text>
        <mj-text font-size="13px" color="#71717a">{{destaque3_resumo}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-button background-color="#9333ea" color="#ffffff" font-size="15px" font-weight="bold" border-radius="24px" href="{{link_blog}}">
          Ler Tudo no Blog
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Você recebeu este e-mail porque assina a newsletter.
          <a href="{{link_descadastro}}" style="color: #a1a1aa;">Cancelar inscrição</a><br/>
          © 2026 Marketing Newsletter. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Novidades da Semana — {{dataEdicao}}\n\n1. {{destaque1_titulo}}: {{destaque1_resumo}}\n2. {{destaque2_titulo}}: {{destaque2_resumo}}\n3. {{destaque3_titulo}}: {{destaque3_resumo}}\n\nLeia tudo em: {{link_blog}}\nCancelar inscrição: {{link_descadastro}}',
			createdAt: daysAgo(68),
		},
		{
			// Soft-deleted de propósito — deliberadamente simples e sem estilo,
			// representando o formato "antigo" que foi substituído pela Newsletter
			// Semanal acima. Também testa se listagens/rankings ignoram linhas com
			// deletedAt preenchido.
			id: uuidv4(),
			name: 'Newsletter Formato Antigo (Descontinuado)',
			service_id: services[1].id,
			creator_id: services[1].creator_id,
			global: false,
			subject_template: 'Edição Especial',
			html_content:
				'<mjml><mj-body width="600px"><mj-section><mj-column><mj-text font-size="13px" color="#000000">Edição Especial - {{dataEdicao}}</mj-text><mj-text font-size="13px" color="#000000">{{conteudo}}</mj-text><mj-text font-size="11px" color="#666666">Para cancelar o recebimento, responda este e-mail com "SAIR".</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content:
				'Edição Especial - {{dataEdicao}}\n{{conteudo}}\nPara cancelar o recebimento, responda este e-mail com "SAIR".',
			createdAt: daysAgo(74),
			deletedAt: daysAgo(20),
		},

		// ===== Service Internal System Admin (index 2) =====
		{
			id: uuidv4(),
			name: 'Alerta Crítico',
			service_id: services[2].id,
			creator_id: services[2].creator_id,
			global: false,
			subject_template: '[CRÍTICO] {{alertType}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>[CRÍTICO] {{alertType}}</mj-title>
    <mj-preview>Um alerta de severidade crítica foi disparado na infraestrutura.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="14px" color="#e2e8f0" line-height="20px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 11px !important; color: #64748b !important; text-align: center; }
      .log-line { font-family: 'Courier New', Courier, monospace !important; font-size: 12px !important; color: #f87171 !important; }
      .field-label { font-size: 11px !important; color: #94a3b8 !important; text-transform: uppercase; letter-spacing: 0.05em; }
      .field-value { font-size: 13px !important; color: #f1f5f9 !important; font-weight: bold; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#0f172a">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#1e293b" padding="24px" border-radius="8px 8px 0 0" border="1px solid #334155">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#f87171" align="center">
          🔴 ALERTA CRÍTICO
        </mj-text>
        <mj-text align="center" color="#94a3b8" font-size="13px" padding-top="4px">
          {{alertType}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#1e293b" padding="0 24px" border-left="1px solid #334155" border-right="1px solid #334155">
      <mj-column width="50%">
        <mj-text css-class="field-label" padding-bottom="2px">Serviço Afetado</mj-text>
        <mj-text css-class="field-value" padding-bottom="16px">{{servicoNome}}</mj-text>
      </mj-column>
      <mj-column width="50%">
        <mj-text css-class="field-label" padding-bottom="2px">Detectado em</mj-text>
        <mj-text css-class="field-value" padding-bottom="16px">{{detectadoEm}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#0b1120" padding="16px" border-left="1px solid #334155" border-right="1px solid #334155">
      <mj-column>
        <mj-text css-class="field-label" padding-bottom="8px">Log</mj-text>
        <mj-text css-class="log-line">
          [ERROR] {{error}}<br/>
          {{stackHint}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#1e293b" padding="20px 24px 28px" border-radius="0 0 8px 8px" border-left="1px solid #334155" border-right="1px solid #334155" border-bottom="1px solid #334155">
      <mj-column>
        <mj-button background-color="#dc2626" color="#ffffff" font-size="14px" font-weight="bold" border-radius="6px" href="{{link_monitoramento}}">
          Ver Painel de Monitoramento
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Este alerta foi gerado automaticamente pelo sistema de monitoramento interno.<br/>
          © 2026 Internal System Admin.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'[CRÍTICO] {{alertType}}\nServiço: {{servicoNome}}\nDetectado em: {{detectadoEm}}\nLog: [ERROR] {{error}} — {{stackHint}}\n\nPainel: {{link_monitoramento}}',
			createdAt: daysAgo(110),
		},

		// ===== Service CRM Notificações (index 3) =====
		{
			id: uuidv4(),
			name: 'Contato Efetuado',
			service_id: services[3].id,
			creator_id: services[3].creator_id,
			global: false,
			subject_template: 'Atualização no seu ticket',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Atualização no seu ticket #{{ticketId}}</mj-title>
    <mj-preview>Sua solicitação teve uma nova atualização.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#334155" line-height="22px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #94a3b8 !important; text-align: center; }
      .badge { font-size: 11px !important; color: #ffffff !important; font-weight: bold; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f0fdfa">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#ffffff" padding="28px 24px 12px" border-radius="8px 8px 0 0" box-shadow="0 4px 6px rgba(0,0,0,0.04)">
      <mj-column width="70%">
        <mj-text font-size="20px" font-weight="bold" color="#134e4a">
          Ticket #{{ticketId}}
        </mj-text>
      </mj-column>
      <mj-column width="30%" vertical-align="middle">
        <mj-text align="right">
          <span class="badge" style="background-color:#14b8a6; padding: 4px 10px; border-radius: 12px;">{{ticketStatus}}</span>
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="8px 24px">
      <mj-column>
        <mj-divider border-color="#e2e8f0" border-width="1px" padding-bottom="12px" />
        <mj-text>
          Olá, {{contatoNome}}! Sua solicitação sobre <strong>"{{ticketAssunto}}"</strong> recebeu uma resposta
          da nossa equipe:
        </mj-text>
        <mj-text background-color="#f0fdfa" border-radius="6px" padding="16px" font-style="italic" color="#0f766e">
          "{{respostaResumo}}"
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="4px 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-button background-color="#0f766e" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_ticket}}">
          Ver Ticket Completo
        </mj-button>
        <mj-text align="center" font-size="12px" color="#94a3b8" padding-top="14px">
          Ficou satisfeito com o atendimento? Responda este e-mail com sua nota de 1 a 5.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Este e-mail foi enviado pelo módulo de atendimento do CRM.<br/>
          © 2026 CRM Notificações. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Ticket #{{ticketId}} — {{ticketStatus}}\nAssunto: {{ticketAssunto}}\nResposta: "{{respostaResumo}}"\n\nVer ticket completo: {{link_ticket}}',
			createdAt: daysAgo(52),
		},

		// ===== Service App Mobile Notifier (index 4) =====
		{
			id: uuidv4(),
			name: 'Login Efetuado',
			service_id: services[4].id,
			creator_id: services[4].creator_id,
			global: false,
			subject_template: 'Novo login detectado',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Novo login detectado</mj-title>
    <mj-preview>Identificamos um novo acesso à sua conta.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#e2e8f0" line-height="22px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #64748b !important; text-align: center; }
      .field-label { font-size: 11px !important; color: #94a3b8 !important; text-transform: uppercase; letter-spacing: 0.05em; }
      .field-value { font-size: 14px !important; color: #f8fafc !important; font-weight: bold; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#18181b">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#27272a" padding="32px 24px 16px" border-radius="8px 8px 0 0">
      <mj-column>
        <mj-text font-size="40px" align="center">🔐</mj-text>
        <mj-text font-size="20px" font-weight="bold" color="#f8fafc" align="center" padding-top="8px">
          Novo login detectado
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#27272a" padding="8px 24px">
      <mj-column width="50%">
        <mj-text css-class="field-label" padding-bottom="2px">Dispositivo</mj-text>
        <mj-text css-class="field-value" padding-bottom="14px">{{dispositivo}}</mj-text>
      </mj-column>
      <mj-column width="50%">
        <mj-text css-class="field-label" padding-bottom="2px">Localização Aproximada</mj-text>
        <mj-text css-class="field-value" padding-bottom="14px">{{localizacao}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#27272a" padding="0 24px 20px">
      <mj-column>
        <mj-text css-class="field-label" padding-bottom="2px">Data e Hora</mj-text>
        <mj-text css-class="field-value">{{dataHora}}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#27272a" padding="0 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-divider border-color="#3f3f46" border-width="1px" padding-bottom="20px" />
        <mj-text color="#d4d4d8">
          Foi você? Nenhuma ação é necessária. Se não reconhece este acesso, proteja sua conta agora.
        </mj-text>
        <mj-button background-color="#f97316" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_seguranca}}" padding="16px 0 0">
          Não fui eu, proteger minha conta
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Alerta de segurança automático — App Mobile Notifier.<br/>
          © 2026 App Mobile Notifier. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Novo login detectado\nDispositivo: {{dispositivo}}\nLocalização: {{localizacao}}\nData/Hora: {{dataHora}}\n\nNão foi você? Proteja sua conta: {{link_seguranca}}',
			createdAt: daysAgo(45),
		},

		// ===== Service Faturamento Automático (index 5) =====
		{
			id: uuidv4(),
			name: 'Boleto Vencido',
			service_id: services[5].id,
			creator_id: services[5].creator_id,
			global: false,
			subject_template: 'Aviso de Vencimento',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Aviso de Vencimento</mj-title>
    <mj-preview>Sua fatura vence hoje — evite a cobrança de multa e juros.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#451a03" line-height="22px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #a8a29e !important; text-align: center; }
      .warn-box { font-size: 13px !important; color: #92400e !important; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#fffbeb">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#ffffff" padding="28px 24px 8px" border-radius="8px 8px 0 0" box-shadow="0 4px 6px rgba(0,0,0,0.04)">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#92400e" align="center">
          ⚠️ Fatura Próxima do Vencimento
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="8px 24px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#a8a29e" text-transform="uppercase" letter-spacing="0.08em">
          Valor a Pagar
        </mj-text>
        <mj-text align="center" font-size="32px" font-weight="bold" color="#b45309" padding-top="2px">
          {{valorFatura}}
        </mj-text>
        <mj-text align="center" font-size="13px" color="#78716c" padding-top="4px">
          Vencimento: {{dataVencimento}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#fef3c7" padding="14px 20px" border-radius="6px">
      <mj-column>
        <mj-text css-class="warn-box">
          Após o vencimento incidirão multa de 2% e juros de 1% ao mês sobre o valor da fatura.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="20px 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-button background-color="#b45309" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_pagamento}}">
          Pagar Agora (PIX ou Boleto)
        </mj-button>
        <mj-text align="center" font-size="12px" color="#a8a29e" padding-top="14px">
          Código de barras: {{codigoBarras}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Se você já efetuou o pagamento, desconsidere este aviso.<br/>
          © 2026 Faturamento Automático. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Aviso de Vencimento\nValor: {{valorFatura}}\nVencimento: {{dataVencimento}}\nApós o vencimento: multa de 2% + juros de 1% a.m.\nCódigo de barras: {{codigoBarras}}\n\nPague agora: {{link_pagamento}}',
			createdAt: daysAgo(36),
		},

		// ===== Service Sistema de RH (index 6) =====
		{
			id: uuidv4(),
			name: 'Admissão de Colaborador',
			service_id: services[6].id,
			creator_id: services[6].creator_id,
			global: false,
			subject_template: 'Bem-vindo(a) à equipe, {{nome}}',
			html_content: `
<mjml>
  <mj-head>
    <mj-title>Bem-vindo(a) à equipe, {{nome}}!</mj-title>
    <mj-preview>Seu primeiro dia está chegando — veja o que preparamos pra você.</mj-preview>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text font-size="15px" color="#1c1917" line-height="23px" />
    </mj-attributes>
    <mj-style>
      .footer-text { font-size: 12px !important; color: #a8a29e !important; text-align: center; }
      .check-item { font-size: 14px !important; color: #1c1917 !important; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f0fdf4">
    <mj-section padding-bottom="16px"></mj-section>

    <mj-section background-color="#059669" padding="36px 24px" border-radius="8px 8px 0 0">
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" color="#ffffff" align="center">
          Seja bem-vindo(a), {{nome}}! 🌱
        </mj-text>
        <mj-text align="center" color="#d1fae5" font-size="14px" padding-top="6px">
          Estamos muito felizes em ter você no time.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="28px 24px 12px">
      <mj-column>
        <mj-text>
          Seu primeiro dia é <strong>{{dataAdmissao}}</strong> e vamos te acompanhar em cada passo dessa
          jornada. Antes de começar, separamos um checklist rápido:
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px">
      <mj-column width="10%"><mj-text css-class="check-item">✅</mj-text></mj-column>
      <mj-column width="90%"><mj-text css-class="check-item">Acesse o portal do colaborador e confirme seus dados cadastrais.</mj-text></mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="8px 24px">
      <mj-column width="10%"><mj-text css-class="check-item">✅</mj-text></mj-column>
      <mj-column width="90%"><mj-text css-class="check-item">Envie os documentos pendentes indicados no seu perfil.</mj-text></mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="8px 24px 28px">
      <mj-column width="10%"><mj-text css-class="check-item">✅</mj-text></mj-column>
      <mj-column width="90%"><mj-text css-class="check-item">Agende sua integração com o time de {{setor}}.</mj-text></mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="0 24px 32px" border-radius="0 0 8px 8px">
      <mj-column>
        <mj-button background-color="#059669" color="#ffffff" font-size="15px" font-weight="bold" border-radius="6px" href="{{link_portal}}">
          Acessar Portal do Colaborador
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section>
      <mj-column>
        <mj-text css-class="footer-text">
          Qualquer dúvida, fale com o time de RH pelo canal interno.<br/>
          © 2026 Sistema de RH. Todos os direitos reservados.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
			text_content:
				'Bem-vindo(a), {{nome}}!\nSeu primeiro dia é {{dataAdmissao}}.\nChecklist: confirme seus dados no portal, envie documentos pendentes, agende integração com {{setor}}.\n\nPortal do colaborador: {{link_portal}}',
			createdAt: daysAgo(30),
		},
	];

	const templatesToInsert = await Promise.all(
		templatesRaw.map(async (t) => {
			let compiled_html: string | null = null;
			if (t.html_content && t.html_content.includes('<mjml>')) {
				try {
					const result = await mjml2html(t.html_content, { validationLevel: 'soft' });
					compiled_html = result.html;
				} catch (err) {
					console.error(`Erro ao compilar seed template ${t.name}:`, err);
				}
			}
			return {
				...t,
				compiled_html,
			};
		}),
	);

	const insertedTemplates = await db.insert(template).values(templatesToInsert).returning();

	// Trilha de auditoria (template_log) — CREATED pra todos, UPDATED pra
	// alguns, DELETED pro que foi soft-deleted acima.
	const logsToInsert = insertedTemplates.flatMap((t) => {
		const logs = [
			{
				id: uuidv4(),
				template_id: t.id,
				actor_id: t.creator_id,
				action: 'TEMPLATE_CREATED',
				description: `Criou o template "${t.name}"`,
				metadata: { template_id: t.id },
				createdAt: t.createdAt,
			},
		];
		if (t.name === 'Newsletter Semanal' || t.name === 'Alerta Crítico') {
			logs.push({
				id: uuidv4(),
				template_id: t.id,
				actor_id: t.creator_id,
				action: 'TEMPLATE_UPDATED',
				description: `Atualizou o conteúdo do template "${t.name}"`,
				metadata: { template_id: t.id },
				createdAt: new Date(t.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
			});
		}
		if (t.deletedAt) {
			logs.push({
				id: uuidv4(),
				template_id: t.id,
				actor_id: t.creator_id,
				action: 'TEMPLATE_DELETED',
				description: `Removeu o template "${t.name}"`,
				metadata: { template_id: t.id },
				createdAt: t.deletedAt,
			});
		}
		return logs;
	});

	await db.insert(template_log).values(logsToInsert);

	return insertedTemplates;
}
