import { db } from '../config/dbConfig.js';
import { template } from '../config/db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedTemplates(users: any[], services: any[]) {
	const [adminUser, normalUser] = users;

	const templatesToInsert = [
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
		},
		{
			id: uuidv4(),
			name: 'Recibo de Compra Global',
			service_id: null,
			creator_id: adminUser.id,
			global: true,
			subject_template: 'Seu Recibo Universal #{{orderId}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Aqui está seu recibo: {{amount}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Aqui está seu recibo: {{amount}}',
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
		},
		// Service E-commerce API (index 0)
		{
			id: uuidv4(),
			name: 'Confirmação de Pedido',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Pedido Confirmado #{{orderId}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Seu pedido foi confirmado!</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Seu pedido foi confirmado!',
		},
		{
			id: uuidv4(),
			name: 'Envio Rastreio',
			service_id: services[0].id,
			creator_id: services[0].creator_id,
			global: false,
			subject_template: 'Seu pacote está a caminho',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Rastreio: {{trackingCode}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Rastreio: {{trackingCode}}',
		},
		// Service Marketing Newsletter (index 1)
		{
			id: uuidv4(),
			name: 'Newsletter Semanal',
			service_id: services[1].id,
			creator_id: services[1].creator_id,
			global: false,
			subject_template: 'Novidades da Semana',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Confira as novidades dessa semana...</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Confira as novidades dessa semana...',
		},
		// Service Internal System Admin (index 2)
		{
			id: uuidv4(),
			name: 'Alerta Crítico',
			service_id: services[2].id,
			creator_id: services[2].creator_id,
			global: false,
			subject_template: '[CRÍTICO] {{alertType}}',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Erro no sistema: {{error}}</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Erro no sistema: {{error}}',
		},
		// Service CRM (index 3)
		{
			id: uuidv4(),
			name: 'Contato Efetuado',
			service_id: services[3].id,
			creator_id: services[3].creator_id,
			global: false,
			subject_template: 'Atualização no seu ticket',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Respondemos sua solicitação.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Respondemos sua solicitação.',
		},
		// Service App Mobile (index 4)
		{
			id: uuidv4(),
			name: 'Login Efetuado',
			service_id: services[4].id,
			creator_id: services[4].creator_id,
			global: false,
			subject_template: 'Novo login detectado',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Alguém fez login na sua conta.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Alguém fez login na sua conta.',
		},
		// Service Faturamento (index 5)
		{
			id: uuidv4(),
			name: 'Boleto Vencido',
			service_id: services[5].id,
			creator_id: services[5].creator_id,
			global: false,
			subject_template: 'Aviso de Vencimento',
			html_content:
				'<mjml><mj-body><mj-section><mj-column><mj-text>Seu boleto vence hoje.</mj-text></mj-column></mj-section></mj-body></mjml>',
			text_content: 'Seu boleto vence hoje.',
		},
	];

	const insertedTemplates = await db.insert(template).values(templatesToInsert).returning();
	return insertedTemplates;
}
