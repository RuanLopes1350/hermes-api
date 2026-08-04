# **PROJETO DE SOFTWARE - Gateway Hermes**

## ***Stakeholders***

| NOME | CARGO/PAPEL | E-MAIL/CONTATO |
| :---- | :---- | :---- |
| Ruan Lopes | Desenvolvedor | intel.spec.lopes@gmail.com |
| Marco Antonio Augusto de Andrade | Professor / Orientador do TCC | marco.andrade@ifro.edu.br |

---

# **Sumário**

* [RESUMO DO PROJETO](#resumo-do-projeto)  
* [INTRODUÇÃO](#introdução)  
  * [PROPÓSITO DESTE DOCUMENTO](#propósito-deste-documento)  
  * [CONCEPÇÃO DO SISTEMA](#concepção-do-sistema)  
* [DESCRIÇÃO GERAL](#descrição-geral)  
  * [USUÁRIOS DO SISTEMA (ATORES)](#usuários-do-sistema-atores)  
  * [ARQUITETURA E DIFERENCIAIS](#arquitetura-e-diferenciais)  
  * [SUPOSIÇÕES E DEPENDÊNCIAS](#suposições-e-dependências)  
* [ESTUDO DE VIABILIDADE](#estudo-de-viabilidade)  
* [REQUISITOS DO SOFTWARE](#requisitos-do-software)  
  * [REQUISITOS FUNCIONAIS (RFs)](#requisitos-funcionais-rfs)  
  * [REQUISITOS NÃO FUNCIONAIS (RNFs)](#requisitos-não-funcionais-rnfs)  
* [ARQUITETURA DE BANCO DE DADOS (ESQUEMA)](#arquitetura-de-banco-de-dados-esquema)
* [DIAGRAMA DE CASOS DE USO](#diagrama-de-casos-de-uso)  
  * [DESCRIÇÃO DOS CASOS DE USO](#descrição-dos-casos-de-uso)  
  * [ESPECIFICAÇÃO DOS CASOS DE USO](#especificação-dos-casos-de-uso)  
* [DIAGRAMAS E FLUXOS DE SEQUÊNCIA](#diagramas-e-fluxos-de-sequência)  

---

# **RESUMO DO PROJETO**

| ITEM | DETALHE |
| :---- | :---- |
| **NOME** | Hermes (Gateway de E-mails Transacionais) |
| **Líder do Projeto** | Ruan Lopes |
| **PRINCIPAL OBJETIVO** | Fornecer uma plataforma multitenant para o envio, gerenciamento e auditoria de e-mails transacionais utilizando templates MJML, filas assíncronas de alta performance e um console administrativo moderno. |
| **BENEFÍCIOS ESPERADOS** | Desacoplamento da lógica de envio de e-mails das aplicações cliente, segurança criptográfica estrita nas credenciais e API Keys, painel reativo com monitoramento analítico em tempo real, suporte robusto a OAuth2 e filas resilientes a falhas. |
| **INÍCIO E TÉRMINO PREVISTOS** | 01/02/2026 – Ativo |

---

# **INTRODUÇÃO**

O **Hermes** foi desenvolvido como uma solução corporativa/acadêmica auto-hospedável de envio de e-mails. A arquitetura descentraliza o envio de e-mails das aplicações de negócio, centralizando credenciais (de múltiplos servidores SMTP ou contas Google OAuth2), templates de e-mail e métricas de envio em um único painel.

A concepção do sistema se originou da necessidade de centralizar a comunicação de e-mails de múltiplos projetos acadêmicos e administrativos do Instituto Federal de Rondônia (IFRO - Campus Vilhena) em uma plataforma segura, auditável e que não dependa de provedores externos proprietários caros.

## **PROPÓSITO DESTE DOCUMENTO**

Detalhar a especificação técnica de software do ecossistema Hermes (compreendendo a `hermes-api`, o `hermes-front` e o SDK `hermes-client`), servindo como guia de projeto para engenheiros de software, administradores de sistema e referencial teórico para o Trabalho de Conclusão de Curso (TCC).

## **CONCEPÇÃO DO SISTEMA**

A evolução do antigo projeto monolítico/MongoDB (`mailsender`) para o Hermes reflete a adoção de padrões modernos de engenharia de software: **Separação de responsabilidades (Gateway de API vs Worker de Fila)**, banco de dados relacional robusto (**PostgreSQL** com regras estritas de integridade referencial), filas com priorização (**BullMQ/Redis**), autenticação avançada integrada com controle de sessão e OAuth2 social (**Better Auth**), e um **SDK TypeScript oficial** (`hermes-client`) para integração simplificada com rotação automática de API Keys.

---

# **DESCRIÇÃO GERAL**

O Hermes funciona em uma arquitetura de microsserviços. As aplicações integradas (clientes) realizam requisições HTTP REST — diretamente ou através do SDK `hermes-client` — contendo chaves de API, variáveis dinâmicas e o ID do template. A `hermes-api` recebe a requisição, autentica o serviço, registra o e-mail no banco com status `pending` e insere o trabalho em uma fila Redis gerenciada pelo BullMQ. O `hermes-worker` (processo separado dentro de `hermes-api`) consome a fila assincronamente, compila o template com Handlebars, converte a sintaxe MJML para HTML padrão de e-mails e dispara a mensagem através da credencial SMTP configurada.

## **USUÁRIOS DO SISTEMA (ATORES)**

* **Administrador Geral (Admin):** Usuário com privilégios de sistema para gerenciar todos os usuários, visualizar métricas globais e auditar toda a atividade do gateway.
* **Usuário Comum (Gestor de Serviço / Desenvolvedor):** Pode criar seus próprios "Serviços" (aplicativos), configurar credenciais SMTP para cada serviço, gerenciar templates (MJML) e API Keys associadas.
* **Sistema Cliente (Aplicação Integrada):** Sistema externo que consome a API do Hermes — diretamente via HTTP ou através do SDK `hermes-client` — enviando um token de autorização de API Key (`X-API-Key`) no cabeçalho das requisições para disparar e-mails programaticamente.

## **ARQUITETURA E DIFERENCIAIS**

O Hermes destaca-se por fornecer:
1. **Multi-serviço (Multi-tenant):** Serviços isolados de forma que os usuários gerenciam suas chaves de API e templates sem conflito de namespace.
2. **Segurança Avançada:**
   * Criptografia de senhas SMTP e Tokens Google com cifra simétrica **AES-256-GCM**.
   * Armazenamento de chaves de API com hash de via única **Argon2id**.
   * Identificação de chaves baseada em prefixo rápido (`hm_prefix.secret`), evitando buscas ineficientes.
3. **Google OAuth2 XOAUTH2 Dinâmico:** Fluxo nativo no painel administrativo para autorizar chaves de envio via OAuth2 de aplicativos Google Cloud configurados por Serviço.
4. **Fila com Priorização:** Gerenciamento com BullMQ/Redis com suporte a prioridades (`high`, `medium`, `low`), retentativas automáticas exponenciais e cancelamento de jobs agendados.
5. **Atualizações em Tempo Real (SSE):** O painel administrativo recebe métricas e status de e-mails via Server-Sent Events de maneira unidirecional (Server → Client), otimizado por throttling (debounce) para não sobrecarregar o Node.js.
6. **SDK Oficial (`hermes-client`):** Pacote NPM (`@ruanlopes1350/hermes-client`) em TypeScript com interface fluida (Builder pattern). Automatiza para as aplicações clientes a validação de assinaturas criptográficas (`HMAC-SHA256`) dos Webhooks e atualiza dinamicamente as chaves via *Storage Adapters* (`MemoryAdapter`, `EnvAdapter` ou customizados), garantindo **rotação de API Keys com zero-downtime** sem necessidade de lógica repetitiva.

## **SUPOSIÇÕES E DEPENDÊNCIAS**

* **Infraestrutura:** Servidor local ou em nuvem com Node.js 20+ e Docker/Docker Compose para provisionar PostgreSQL 15 e Redis Alpine.
* **SMTP:** Acesso a servidores de envio de e-mails (como SMTP do Gmail com App Passwords ou Client Secrets de aplicativos do console Google Cloud).

---

# **ESTUDO DE VIABILIDADE**

* **Técnica:** O uso de **TypeScript**, **estrutura modular Express**, **Better Auth**, e **Drizzle ORM** oferece alta confiabilidade de tipo, mitigando erros em tempo de execução. A escolha do **MJML** resolve a clássica inconsistência de layouts HTML nos clientes de e-mail (Outlook, Gmail). O SDK `hermes-client` resolve o problema de rotação de chaves sem downtime, um requisito crítico em integrações de produção.
* **Econômica:** Reduz drasticamente os custos operacionais de envio em nuvem (como Amazon SES ou SendGrid) ao permitir o roteamento do tráfego corporativo/acadêmico através de contas de e-mail institucionais existentes (SMTP/Google OAuth2).
* **Legal:** O projeto opera sob a licença de código aberto **ISC**. A segurança aplicada nos e-mails (AES-256-GCM para dados sensíveis e Argon2 para chaves) está em total conformidade com a LGPD (Lei Geral de Proteção de Dados) no tratamento de metadados e credenciais de usuários.

---

# **REQUISITOS DO SOFTWARE**

## **REQUISITOS FUNCIONAIS (RFs)**

### 👤 Gerenciamento de Usuários e Autenticação
* **RF001 - Autenticação Better Auth:** O sistema deve suportar autenticação de usuários via login por e-mail/senha e login social com Google.
* **RF002 - Controle de Acesso Baseado em Sessão:** Apenas usuários autenticados com sessão ativa no Better Auth devem acessar o console administrativo (`hermes-front`).
* **RF003 - Gerenciamento de Perfis:** O usuário autenticado deve poder editar seus dados de perfil (nome, senha e avatar).
* **RF004 - Painel do Administrador Geral:** Um usuário com flag `isAdmin` no banco de dados deve poder monitorar usuários, auditar o tráfego global e gerenciar a infraestrutura.

### 🏢 Gerenciamento de Serviços (Tenant Spaces)
* **RF005 - Criação de Serviços:** O usuário deve poder criar "Serviços" (ex: "Sistema Acadêmico", "Financeiro") para servir como namespaces isolados de chaves de API, templates e logs.
* **RF006 - Configurações de Serviço:** O usuário deve poder definir limites de segurança, Webhooks e políticas de notificação específicas por serviço.

### ✉️ Gerenciamento de Credenciais SMTP e OAuth2
* **RF007 - Cadastro de Credenciais SMTP:** O sistema deve permitir o cadastro de servidores SMTP contendo host, porta, flag secure, usuário e senha (criptografada).
* **RF008 - Fluxo de Autorização Google OAuth2 (XOAUTH2):** O sistema deve fornecer um fluxo para conectar credenciais de e-mail ao Gmail de forma segura via tela de consentimento Google, armazenando o Token de Refresh em AES-256-GCM.
* **RF009 - Associação de Credencial a Chaves de API:** Cada chave de API criada deve estar associada a uma credencial de envio específica, determinando o remetente de cada requisição programática.

### 🔑 Chaves de API (Segurança e Ciclo de Vida)
* **RF010 - Geração Segura de API Keys:** O sistema deve criar chaves contendo um prefixo identificador público (`hm_[4_bytes_hex].`) e um segredo forte.
* **RF011 - Armazenamento de Chave com Argon2:** O banco de dados PostgreSQL deve registrar apenas o hash gerado com Argon2 do segredo da chave de API.
* **RF012 - Validação Rápida via Prefixo:** O middleware `requireApiKey` deve buscar registros pelo prefixo público no banco e validar o segredo via Argon2 apenas para as chaves candidatas encontradas.
* **RF013 - Rotação Diária Automática de Chaves:** O sistema deve executar um job diário à meia-noite (BullMQ) para rotacionar automaticamente as chaves cujos prazos de validade estejam no limite configurado.
* **RF014 - Webhooks de Expiração/Rotação:** O sistema deve disparar notificações HTTPS contendo assinatura HMAC SHA-256 para avisar serviços integrados sobre chaves rotacionadas ou expirando.

### 📝 Templates MJML e Injeção Dinâmica
* **RF015 - Repositório de Templates Dinâmicos:** O sistema deve salvar templates em formato MJML vinculados aos serviços (ou globais).
* **RF016 - Processamento Handlebars:** O Worker do Hermes deve pré-processar o template substituindo variáveis dinâmicas enviadas no JSON de requisição.
* **RF017 - Compilação MJML para HTML:** O sistema deve transpilar o MJML processado para HTML 100% responsivo compatível com leitores de e-mail.
* **RF018 - Editor Monaco com Preview:** O console administrativo deve integrar o Monaco Editor permitindo criar templates MJML com visualização imediata renderizada em iframe.

### ⚡ Enfileiramento e Processamento (Fila BullMQ)
* **RF019 - Enfileiramento de E-mails com Prioridade:** A API do Hermes deve aceitar requisições de envio em `/api/emails` (via API Key), registrar o e-mail como `pending` e enfileirar o processamento com prioridades (`high`, `medium`, `low`). O `serviceId` é inferido automaticamente a partir da API Key.
* **RF020 - Retentativas Exponenciais Automáticas:** E-mails que falharem no envio devido a erros temporários de conexão SMTP devem ser re-enfileirados automaticamente com incremento exponencial de delay (backoff).
* **RF021 - Logs Detalhados de Erros SMTP:** Em caso de falha definitiva (após 3 tentativas), o Worker deve registrar o erro SMTP detalhado no registro do e-mail.
* **RF022 - Agendamento de Envios:** O sistema deve aceitar e processar e-mails com data agendada (`scheduled_at`), liberando-os na fila do Redis somente no momento estipulado.
* **RF023 - Cancelamento de E-mails Agendados:** O gestor do serviço deve poder cancelar envios de e-mails de status `pending` ou `retrying` agendados para o futuro.

### 📊 Dashboard e Monitoramento Analítico
* **RF024 - Gráficos Analíticos com ECharts:** O painel administrativo do Hermes deve carregar gráficos analíticos de entregabilidade de e-mails (total enviado, falhas, taxa de conversão) por períodos.
* **RF025 - Auditoria de Requisições:** O console administrativo deve listar logs de auditoria das requisições e acessos aos serviços.
* **RF026 - Atualização em Tempo Real (SSE):** O dashboard deve atualizar as métricas dos e-mails processados em tempo real utilizando Server-Sent Events (SSE) atrelados ao Pub/Sub do Redis e QueueEvents do BullMQ.

### 📦 SDK de Integração (`hermes-client`)
* **RF027 - Instalação via NPM:** O SDK deve ser publicado e instalável via `npm install @ruanlopes1350/hermes-client`.
* **RF028 - Interface Fluida (Builder Pattern):** O SDK deve expor um Email Builder com interface encadeada para construção e envio de e-mails (`.to()`, `.subject()`, `.useTemplate()`, `.send()`).
* **RF029 - Envio em Bulk:** O SDK deve suportar o envio de múltiplos e-mails em uma única chamada via `hermes.bulk()`.
* **RF030 - Handlers de Webhook Plug-and-Play:** O SDK deve fornecer middlewares prontos para Express, Next.js (App Router) e Fastify que validam a assinatura HMAC e atualizam a chave automaticamente.
* **RF031 - Storage Adapters Intercambiáveis:** O SDK deve suportar `MemoryAdapter` (padrão), `EnvAdapter` (escrita em arquivo `.env`) e permitir adaptadores customizados (ex: `RedisAdapter` para ambientes multi-instância).

---

## **REQUISITOS NÃO FUNCIONAIS (RNFs)**

* **RNF001 - Desempenho do Gateway:** A API deve registrar e responder com `201 Created` (e-mail aceito e enfileirado) em menos de **100ms** (média).
* **RNF002 - Concorrência e Vazão:** O Worker deve suportar o processamento concorrente de no mínimo **5 jobs simultâneos** por instância de processo.
* **RNF003 - Resiliência Fila-Banco:** Em caso de perda de conexão com o PostgreSQL, os jobs do Worker devem permanecer íntegros na fila Redis para processamento posterior.
* **RNF004 - Segurança Criptográfica:** Credenciais do SMTP e tokens do Google devem ser criptografados com criptografia simétrica **AES-256-GCM** com vetor de inicialização (IV) exclusivo por registro.
* **RNF005 - Segurança das API Keys:** As chaves de API devem ser hashes irreversíveis baseados no algoritmo **Argon2id** (com alto custo de memória e tempo para inviabilizar ataques de força bruta).
* **RNF006 - Responsividade UI:** A interface gráfica em Next.js deve carregar interações abaixo de **2s** e ser responsiva em resoluções de desktop, tablets e smartphones.
* **RNF007 - Escalabilidade:** O sistema deve permitir o escalonamento horizontal escalando múltiplas instâncias do `hermes-worker` sob a mesma fila Redis.
* **RNF008 - Compatibilidade do SDK:** O pacote `hermes-client` deve ser compatível com ambientes Node.js 18+, Edge Runtimes (ex: Vercel, Cloudflare Workers) e publicado em formato dual (ESM + CJS).

---

# **ARQUITETURA DE BANCO DE DADOS (ESQUEMA)**

O banco de dados relacional (PostgreSQL 15) está mapeado via Drizzle ORM. O diagrama lógico a seguir representa a modelagem relacional estrita implementada no Hermes:

```
    ┌──────────────────────┐
    │         USER         │
    ├──────────────────────┤
    │ PK  id               │◄───────────────────────────────┐
    │     name             │                                │
    │     email (unique)   │                                │
    │     isAdmin          │                                │
    └──────────────────────┘                                │
      ▲               ▲                                     │
      │ (1:N)         │ (1:N)                               │
      │               │                                     │
      │     ┌─────────┴────────────┐                        │
      │     │    SERVICE_MEMBER    │                        │
      │     ├──────────────────────┤                        │
      │     │ PK  id               │                        │
      │     │ FK  user_id          │                        │
      │     │ FK  service_id       │────────────┐           │
      │     │     role             │            │           │
      │     └──────────────────────┘            │           │
      │                                         │           │
      │     ┌──────────────────────┐            │           │
      │     │       SERVICE        │            │           │
      │     ├──────────────────────┤            │           │
      └─────│ FK  creator_id       │            │           │
            │ PK  id               │◄───────────┘           │
            │     name             │                        │
            │     settings (jsonb) │                        │
            └──────────────────────┘                        │
              ▲       ▲         ▲                           │
      (1:N)   │       │ (1:N)   │ (1:N)                     │
              │       │         └─────────────────────────────────────┐
              │       │                                               │
              │  ┌────┴─────────────────┐     ┌───────────────────────┴──────┐
              │  │      TEMPLATE        │     │         CREDENTIAL           │
              │  ├──────────────────────┤     ├──────────────────────────────┤
              │  │ PK  id               │     │ PK  id                       │◄───────┐
              │  │ FK  service_id       │     │ FK  service_id               │        │
              │  │ FK  creator_id       │──┐  │ FK  creator_id               │──┘     │
              │  │     subject_template │  │  │     auth_type (enum)         │        │
              │  │     html_content     │  │  │     smtp_host/port           │        │
              │  └──────────────────────┘  │  │     passkey (enc)            │        │
              │            ▲               │  │     refresh_token(enc)       │        │
              │            │ (1:N)         │  │     key_hash (argon2)        │        │
              │            │               │  │     prefix                   │        │
              └────────────┼─────────────┐ │  │     is_active                │        │
                           │             │ │  └──────────────────────────────┘        │
  ┌────────────────────────┼─────────────┼─┘                                          │
  │                     EMAIL            │                                            │
  ├──────────────────────────────────────┼────────────────────────────────────────────┤
  │ PK  id                               │                                            │
  │ FK  service_id                       │                                            │
  │ FK  credential_id                    │────────────────────────────────────────────┘
  │ FK  template_id ─────────────────────┘
  │     subject
  │     recipient_to
  │     variables (jsonb)
  │     status (pending/sent/failed/retrying)
  │     scheduled_at
  │     error_log
  └──────────────────────────────────────┘
```

> **Nota:** O campo `FK  template_id` na tabela `EMAIL` era anteriormente referenciado como `service_template_id` na documentação antiga e no SDK legado. O nome correto no schema atual é `template_id`. O campo `service_template_id` está marcado como `@deprecated` no SDK.

---

# **DIAGRAMA DE CASOS DE USO**

O sistema Hermes expõe interações distintas para seus três atores principais:

## **DESCRIÇÃO DOS CASOS DE USO**

* **Aplicações Clientes (Sistemas Externos):**
  * **Disparar E-mail (POST):** Consome o endpoint HTTP enviando o token de chave de API no cabeçalho e variáveis de conteúdo — diretamente ou via SDK `hermes-client`.
  * **Receber Webhook de Rotação:** Recebe e valida o payload HMAC assinado com a nova API Key.
* **Usuários do Painel (Gestores de Serviço / Desenvolvedores):**
  * **Autenticar no Console:** Login via e-mail e senha ou login social do Google via Better Auth.
  * **Criar/Gerenciar Serviços:** Organizar namespaces de e-mail.
  * **Cadastrar Credenciais SMTP/Google OAuth:** Configurar servidores SMTP corporativos ou autenticar contas do Gmail.
  * **Criar/Editar Templates MJML:** Desenvolver e testar templates com renderização ao vivo.
  * **Gerenciar API Keys:** Criar chaves vinculadas a credenciais e definir datas de expiração e Webhooks de notificação.
  * **Auditar Envios e Dashboard:** Visualizar gráficos analíticos de status de e-mails do serviço e log de erros.
* **Administrador Geral (Admin):**
  * **Gerenciar Usuários e Logs:** Visualizar todos os serviços criados no ecossistema e auditar o desempenho de envio do gateway global.

---

## **ESPECIFICAÇÃO DOS CASOS DE USO**

### **UC-01 - Enfileirar e Enviar E-mail (Via API Key)**

* **Ator:** Sistema Cliente (Aplicação Integrada)
* **Pré-condições:** O sistema cliente possui uma API Key válida vinculada a um serviço e a uma credencial de envio ativa.
* **Fluxo Principal:**
  1. O cliente faz uma requisição `POST` em `/api/emails` com cabeçalho `X-API-Key`.
  2. O middleware `requireApiKey` isola o prefixo da chave, localiza a API Key candidata no banco, e valida o segredo completo via Argon2.
  3. Se válido, o sistema valida se a chave pertence ao `:serviceId` solicitado e extrai o `credentialId` vinculado à chave.
  4. O Hermes valida a integridade do JSON enviado (destinatário, assunto, variáveis dinâmicas).
  5. O e-mail é persistido na tabela `email` com status `pending`.
  6. A requisição HTTP responde com `201 Created` e retorna o ID do e-mail.
  7. Em background, um job é enviado para a fila Redis do BullMQ (`email-queue`) contendo a referência do e-mail.
  8. O `hermes-worker` consome o job, localiza o template associado (se aplicável), compila as variáveis com Handlebars e converte o MJML para HTML.
  9. O Worker descriptografa a senha SMTP/Token Google OAuth2 usando AES-256-GCM com a `MASTER_KEY`.
  10. O Worker faz o disparo SMTP para o destinatário final.
  11. Em caso de sucesso, o status do e-mail é atualizado para `sent` e o tempo do disparo é registrado.

---

### **UC-02 - Autenticar Credencial via Google OAuth2 (Console)**

* **Ator:** Usuário Comum (Gestor de Serviço)
* **Pré-condições:** O usuário está logado no console administrativo e cadastrou um Client ID e Client Secret de um app do Google Cloud Console no serviço Hermes.
* **Fluxo Principal:**
  1. O usuário acessa a aba de Credenciais do seu Serviço e cria uma credencial com tipo de autenticação `OAuth2 (Google)`.
  2. O usuário clica na ação `Autorizar Conta Gmail`.
  3. A API do Hermes gera uma URL de consentimento do Google e redireciona o usuário.
  4. O usuário concede permissão de envio de e-mails (`scope: https://mail.google.com/`).
  5. O Google redireciona o usuário para o callback `/api/callback/google/gmail` com o código de autorização e o parâmetro `state` (com ID da credencial).
  6. A API recebe o código e solicita os tokens (Access e Refresh) ao Google.
  7. A API criptografa o `refresh_token` recebido usando AES-256-GCM com a `MASTER_KEY` e persiste no banco de dados.
  8. O Hermes redireciona o navegador do usuário de volta ao frontend com query parameter `?auth=success`.

---

### **UC-03 - Rotação Automática de API Key com Zero-Downtime**

* **Ator:** Sistema Hermes (Job BullMQ) + Aplicação Cliente
* **Pré-condições:** O serviço está configurado com `auto_rotate = true` e tem um `webhook_url` cadastrado. A aplicação cliente usa o SDK `hermes-client`.
* **Fluxo Principal:**
  1. O job de rotação diária (BullMQ, 00:00 UTC) identifica a chave prestes a expirar.
  2. O Hermes gera uma nova API Key (novo prefixo + segredo + hash Argon2).
  3. A nova chave é inserida no banco e o webhook é disparado para o `webhook_url` configurado.
  4. O payload é assinado com `HMAC-SHA256` usando o `webhook_secret` do serviço.
  5. O SDK `hermes-client` (via middleware `expressWebhookHandler`, `nextWebhookHandler` ou `fastifyWebhookHandler`) valida a assinatura.
  6. Se válida, o SDK atualiza a chave via `storageAdapter.setApiKey(newKey)` e emite o evento `keyRotated`.
  7. As próximas requisições da aplicação cliente já utilizam automaticamente a nova chave.

---

# **DIAGRAMAS E FLUXOS DE SEQUÊNCIA**

## **Fluxo Completo de Despacho Assíncrono de E-mail (Gateway + Queue + Worker)**

```
┌─────────┐             ┌────────────┐           ┌─────────────┐          ┌──────────┐          ┌────────────┐          ┌─────────┐
│ Cliente │             │ Hermes API │           │ Postgres DB │          │  Redis   │          │   Worker   │          │  SMTP   │
└────┬────┘             └─────┬──────┘           └──────┬──────┘          └───┬──────┘          └─────┬──────┘          ────┬────┘
     │                        │                         │                     │                     │                   │
     │   POST /emails         │                         │                     │                     │                   │
     │───────────────────────>│                         │                     │                     │                   │
     │                        │  Valida API Key         │                     │                     │                   │
     │                        │  (Argon2id Hash)        │                     │                     │                   │
     │                        │────────────────────────>│                     │                     │                   │
     │                        │  Chave Válida           │                     │                     │                   │
     │                        │<────────────────────────│                     │                     │                   │
     │                        │                         │                     │                     │                   │
     │                        │  Registra Email         │                     │                     │                   │
     │                        │  Status = 'pending'     │                     │                     │                   │
     │                        │────────────────────────>│                     │                     │                   │
     │                        │  Email Registrado       │                     │                     │                   │
     │                        │<────────────────────────│                     │                     │                   │
     │                        │                         │                     │                     │                   │
     │                        │  Enfileira Job          │                     │                     │                   │
     │                        │──────────────────────────────────────────────>│                     │                   │
     │                        │  Job Enfileirado        │                     │                     │                   │
     │                        │<──────────────────────────────────────────────│                     │                   │
     │                        │                         │                     │                     │                   │
     │   201 Created (ID)     │                         │                     │                     │                   │
     │<───────────────────────│                         │                     │                     │                   │
     │                        │                         │                     │   Job Disponível    │                   │
     │                        │                         │                     │────────────────────>│                   │
     │                        │                         │                     │                     │                   │
     │                        │                         │   Busca Dados DB    │                     │                   │
     │                        │                         │<─────────────────────────────────────────│                   │
     │                        │                         │   (Descriptografa   │                     │                   │
     │                        │                         │    AES SMTP Cred)   │                     │                   │
     │                        │                         │─────────────────────────────────────────>│                   │
     │                        │                         │                     │                     │                   │
     │                        │                         │                     │                     │   Dispara SMTP    │
     │                        │                         │                     │                     │──────────────────>│
     │                        │                         │                     │                     │   Envio OK        │
     │                        │                         │                     │                     │<──────────────────│
     │                        │                         │                     │                     │                   │
     │                        │                         │  Atualiza Status    │                     │                   │
     │                        │                         │  Status = 'sent'    │                     │                   │
     │                        │                         │<──────────────────────────────────────────│                   │
```

---
Este projeto técnico reflete fielmente a implementação corrente do ecossistema de software Hermes.
