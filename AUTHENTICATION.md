# 🔐 Guia de Autenticação - Gateway Hermes

Este documento detalha os dois sistemas de autenticação independentes implementados na arquitetura atual do Hermes: **Better Auth** para o console administrativo e **API Keys Criptográficas** com rotação automática para integrações externas.

---

## 📋 Sumário

1. [Visão Geral](#-visão-geral)
2. [Autenticação de Usuários (Better Auth)](#-autenticação-de-usuários-better-auth)
3. [Autenticação Programática (API Keys Criptográficas)](#-autenticação-programática-api-keys-criptográficas)
4. [Job de Rotação Automática de Chaves](#-job-de-rotação-automática-de-chaves)
5. [Segurança e Criptografia](#-segurança-e-criptografia)

---

## 🎯 Visão Geral

O Hermes adota um modelo híbrido e descentralizado de segurança de acessos:

| Fluxo | Público-Alvo | Mecanismo | Validade | Header / Transporte |
| :--- | :--- | :--- | :--- | :--- |
| **Console Web** | Usuários / Gestores | Better Auth (Cookies/Sessions) | Dinâmica | Cookies HTTPOnly / `Authorization: Bearer <token>` |
| **API Cliente** | Aplicações Integradas | API Key Indexada (Argon2) | Configurável | Header `X-API-Key: hm_prefix.secret` |

---

## 🔑 Autenticação de Usuários (Better Auth)

O console administrativo (`hermes-front`) comunica-se com a `hermes-api` utilizando a biblioteca **Better Auth**.

### 1. Estrutura do Banco de Dados (PostgreSQL)
A integridade da sessão é mantida por meio de quatro tabelas relacionais administradas pelo adaptador Drizzle:
* **`user`:** Registra o cadastro do usuário (nome, e-mail, senha hashed, imagem e flag `is_admin`).
* **`account`:** Registra os provedores de autenticação vinculados ao usuário (como credenciais locais ou login do Google).
* **`session`:** Armazena os tokens de sessão ativos, endereços IP e User-Agent do navegador.
* **`verification`:** Armazena tokens de verificação temporários (como fluxos de reset de senha).

### 2. Fluxo Google OAuth2
O Better Auth está configurado com o plugin de provedores sociais para suportar o **Google Sign-In**.
* O frontend inicia o login redirecionando para `/api/auth/login/social/google`.
* O Better Auth valida a sessão do usuário no Google e cria um registro na tabela `account` e uma nova `session` vinculada no PostgreSQL.

### 3. Exemplo de Requisição Autenticada pelo Front
Para requisições que não utilizam cookies automáticos, o frontend envia o Bearer Token do Better Auth (habilitado via plugin `bearer` no backend):
```http
GET /api/services HTTP/1.1
Host: localhost:3001
Authorization: Bearer [SESSION_TOKEN]
```

---

## 🔐 Autenticação Programática (API Keys Criptográficas)

Para integrar sistemas externos (como um portal de notícias que dispara e-mails de boas-vindas), a autenticação é efetuada por **API Keys**.

### 1. Estrutura de uma API Key no Hermes
As chaves do Hermes são compostas por duas partes separadas por um ponto (`.`):
```
hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f...
└─────┬───┘ └──────────────────────┬──────────────────────┘
      │                            │ Segredo Aleatório (32 bytes em HEX - 64 caracteres)
      └ Prefixo Público (8 caracteres HEX) para busca rápida
```

### 2. Validação Eficiente e Segura (Argon2id)
Para evitar ataques de força bruta, timing attacks e vazamento de banco de dados, o Hermes implementa um processo híbrido de validação:
1. **Indexação por Prefixo:** O banco de dados armazena o `prefix` em texto limpo com índice único. Quando uma requisição com a chave completa chega, o middleware `requireApiKey` divide a chave e busca apenas chaves onde o prefixo bate. Isso reduz a complexidade de processamento de `O(N)` para `O(1)`.
2. **Verificação de Hash Forte:** Com a chave candidata retornada, o sistema executa o algoritmo **Argon2** (`argon2.verify()`) para conferir se o segredo da chave coincide com o hash do banco. O Argon2id é resistente a ataques paralelos por hardware (GPU/ASIC).

```
Requisição (Header X-API-Key: hm_b5c92a10.secret)
                  │
                  ▼
         [Middleware requireApiKey]
                  │
                  ├──► 1. Separa o prefixo: "hm_b5c92a10"
                  │
                  ├──► 2. SQL: SELECT key_hash WHERE prefix = 'hm_b5c92a10'
                  │
                  ▼
         [Chave Candidata Achada?]
                  │
                  ├──► NÃO: Retorna 401 Unauthorized
                  │
                  ▼
         [argon2.verify(key_hash, chave_recebida)]
                  │
                  ├──► FALHOU: Retorna 401 Unauthorized
                  │
                  ▼
         [Verifica Validade & Tenant]
                  │
                  ├──► Expirada / Outro Serviço: Retorna 403 Forbidden
                  │
                  ▼
         Injeta dados da API Key (serviceId, credentialId) no Request e segue
```

### 3. Exemplo de Chamada Programática (Envio de E-mail)
**Request:**
```http
POST /api/services/clxxxxxxx0000xxxx/emails HTTP/1.1
Host: localhost:3001
X-API-Key: hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f
Content-Type: application/json

{
  "recipient_to": "cliente@email.com",
  "subject": "Confirmação de Cadastro",
  "variables": {
    "nome": "João Silva",
    "link": "https://ifro.edu.br"
  }
}
```

---

## 🔄 Job de Rotação Automática de Chaves

O ciclo de vida das chaves de API é monitorado de perto por um cronjob executado de forma distribuída pelo **BullMQ/Redis** diariamente à meia-noite (`0 0 * * *`).

### 1. Inativação Automática de Chaves Expiradas
O Job verifica todas as chaves ativas cuja data `expiresAt` é menor que a data/hora atual e atualiza `is_active = false` imediatamente.

### 2. Varredura de Proximidade e Rotação
Se o serviço estiver configurado com a flag `auto_rotate = true`, o job analisa chaves que estão perto da expiração (dentro de `rotate_threshold_days`, padrão 3 dias):
1. **Geração de Nova Chave:** Gera uma nova chave segura vinculada ao mesmo serviço e à mesma credencial SMTP.
2. **Registro de Rotação:** Insere a nova chave no banco de dados e adiciona a chave antiga à lista de chaves rotacionadas nas configurações do serviço.
3. **Disparo de Webhook:** Envia uma requisição HTTPS `POST` para o `webhook_url` do serviço contendo os dados da nova chave.

### 3. Segurança dos Webhooks (Assinatura HMAC SHA-256)
Para garantir que o webhook realmente partiu do Hermes, o payload HTTP é assinado digitalmente:
* O payload contém o cabeçalho `X-Hermes-Signature`.
* A assinatura é gerada fazendo o HMAC SHA-256 do corpo da requisição usando a chave privada do serviço (`webhook_secret`):
```javascript
const signature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex');
```

---

## 🔒 Segurança e Criptografia

As credenciais sensíveis cadastradas no Hermes são protegidas no banco de dados contra vazamentos por meio de criptografia simétrica:

### 1. Algoritmo AES-256-GCM
Campos como `passkey` (senha SMTP) e `refresh_token` (Google OAuth2) são armazenados no formato:
```
iv_em_hexadecimal:auth_tag_em_hexadecimal:payload_criptografado_em_hexadecimal
```
* **IV (Vetor de Inicialização):** Garante que o mesmo texto simples resulte em textos criptografados diferentes em cada gravação.
* **Auth Tag:** Garante a autenticidade dos dados, prevenindo alterações no payload criptografado.
* **Chave Mestra (`MASTER_KEY`):** Variável de ambiente do servidor utilizada como chave de derivação.

---
Este sistema de segurança garante que mesmo se o banco de dados PostgreSQL for exposto, as credenciais SMTP de produção permanecem ilegíveis e as chaves de API ativas não podem ser descriptografadas.
