# 🔐 Guia de Autenticação - Gateway Hermes

> 🇬🇧 **Looking for the English version?** [AUTHENTICATION.en.md](AUTHENTICATION.en.md)

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
| **API Cliente** | Aplicações Integradas | API Key Indexada (Argon2id) | Configurável | Header `X-API-Key: hm_prefix.secret` |

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
      └ Prefixo Público (8 caracteres HEX) para busca rápida no banco
```

### 2. Validação Eficiente e Segura (Argon2id)
Para evitar ataques de força bruta, timing attacks e vazamento de banco de dados, o Hermes implementa um processo híbrido de validação:
1. **Indexação por Prefixo:** O banco de dados armazena o `prefix` em texto limpo com índice único. Quando uma requisição com a chave completa chega, o middleware `requireApiKey` divide a chave e busca apenas entradas onde o prefixo bate. Isso reduz a complexidade de `O(N)` para `O(1)`.
2. **Verificação de Hash Forte:** Com as candidatas retornadas, o sistema executa o **Argon2** (`argon2.verify()`) para conferir se o segredo da chave coincide com o hash armazenado. O Argon2id é resistente a ataques paralelos por hardware (GPU/ASIC).

```
Requisição (Header X-API-Key: hm_b5c92a10.secret)
                  │
                  ▼
         [Middleware requireApiKey]
                  │
                  ├──► 1. Extrai o prefixo: "hm_b5c92a10"
                  │
                  ├──► 2. SQL: SELECT ... FROM credential
                  │         WHERE prefix = 'hm_b5c92a10'
                  │           AND is_active = true
                  │           AND deleted_at IS NULL
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
         [Verifica Validade (expiresAt)]
                  │
                  ├──► Expirada: Retorna 401 (API_KEY_EXPIRED)
                  │
                  ▼
         Injeta req.serviceId e req.credentialId e chama next()
```

### 3. Exemplo de Chamada Programática (Envio de E-mail)

> **Atenção:** A rota de envio via API Key é `POST /api/emails` (sem serviceId no path). O serviceId e o credentialId são identificados automaticamente pelo middleware a partir da API Key.

**Request:**
```http
POST /api/emails HTTP/1.1
Host: localhost:3001
X-API-Key: hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f
Content-Type: application/json

{
  "recipient_to": "cliente@email.com",
  "subject": "Confirmação de Cadastro",
  "template_id": "cltmplxxxxxx0000xxxx",
  "variables": {
    "nome": "João Silva",
    "link": "https://ifro.edu.br"
  }
}
```

**Response (201 Created):**
```json
{
  "error": false,
  "code": 201,
  "message": "E-mail enfileirado com sucesso!",
  "data": {
    "id": "clemailxxxxxx0000xxxx",
    "status": "pending",
    "recipient_to": "cliente@email.com"
  },
  "errors": []
}
```

---

## 🔄 Job de Rotação Automática de Chaves

O ciclo de vida das chaves de API é monitorado por um cronjob executado de forma distribuída pelo **BullMQ/Redis** diariamente à meia-noite (`0 0 * * *`), iniciado pelo `system.ts`.

### 1. Varredura e Agendamento
O job mestre (`api-key-rotation`) consulta todas as credenciais ativas com `expiresAt` não nulo e, para cada uma cujo serviço tenha `auto_rotate = true` e um `webhook_url` configurado, verifica se a data de expiração está dentro do limiar (`rotate_threshold_days`, padrão: 3 dias). Se sim, enfileira um micro-job `rotate-single-key`.

### 2. Rotação Individual com Retries
O micro-job `rotate-single-key` executa o ciclo completo para uma credencial:
1. **Geração de Nova Chave:** Gera uma nova chave segura (formato `hm_[prefix].[secret]`, hash Argon2id).
2. **Disparo do Webhook Primeiro:** Tenta entregar a nova chave ao `webhook_url` do serviço via `POST` HTTPS assinado. **Se o webhook falhar, o banco não é alterado** - o BullMQ agenda uma nova tentativa com backoff exponencial (até 3 vezes), garantindo que o cliente nunca perca acesso.
3. **Atualização do Banco:** Somente após confirmação do webhook, o banco é atualizado com a nova chave (`key_hash`, `prefix`, `expiresAt`).
4. **Notificação no Painel:** Uma notificação é criada no banco informando o resultado (sucesso ou falha).

### 3. Segurança dos Webhooks (Assinatura HMAC SHA-256)
Para garantir que o webhook realmente partiu do Hermes, o payload HTTP é assinado digitalmente:
* O payload contém o cabeçalho `X-Hermes-Signature`.
* A assinatura é gerada fazendo o HMAC SHA-256 do corpo da requisição serializado em JSON, usando a chave privada do serviço (`webhook_secret`):
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

O payload enviado no webhook contém:
```json
{
  "serviceId": "...",
  "credentialId": "...",
  "newApiKey": "hm_...",
  "rotatedAt": "2026-09-18T00:00:00.000Z",
  "expiresAt": "2026-10-18T00:00:00.000Z"
}
```

---

## 🔒 Segurança e Criptografia

As credenciais sensíveis cadastradas no Hermes são protegidas no banco de dados por meio de criptografia simétrica:

### 1. Algoritmo AES-256-GCM
Campos como `passkey` (senha SMTP) e `refresh_token` (Google OAuth2) são armazenados no formato:
```
iv_em_hexadecimal:auth_tag_em_hexadecimal:payload_criptografado_em_hexadecimal
```
* **IV (Vetor de Inicialização):** Garante que o mesmo texto simples resulte em textos criptografados diferentes em cada gravação.
* **Auth Tag:** Garante a autenticidade dos dados, prevenindo alterações no payload criptografado.
* **Chave Mestra (`MASTER_KEY`):** Variável de ambiente do servidor utilizada como chave de derivação. Nunca trafega fora do servidor.

---

Este sistema de segurança garante que mesmo se o banco de dados PostgreSQL for exposto, as credenciais SMTP de produção permanecem ilegíveis e as chaves de API ativas não podem ser descriptografadas ou utilizadas sem o segredo original.
