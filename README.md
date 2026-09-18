# 🕊️ Hermes - Gateway de E-mails Transacionais

> 🇬🇧 **Looking for the English version?** [README.en.md](README.en.md)

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2+-red.svg)](https://expressjs.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle--ORM-0.45+-yellowgreen.svg)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-alpine-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

**Plataforma profissional e escalável para envio de e-mails transacionais (Gateway de E-mails) com suporte a múltiplos serviços, templates MJML dinâmicos, fila de processamento assíncrono e painel administrativo moderno.**

[📖 Tutorial](TUTORIAL.md) • [🔐 Autenticação](AUTHENTICATION.md) • [📄 Especificação do Projeto](PROJETO.md) <br>
[Painel Frontend](https://github.com/RuanLopes1350/hermes-front) • [Pacote Client (NPM)](https://github.com/RuanLopes1350/hermes-client)

</div>

---

## 📋 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Arquitetura do Sistema](#️-arquitetura-do-sistema)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Iniciar (Desenvolvimento Local)](#-como-iniciar-desenvolvimento-local)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Segurança](#-segurança)

---

## 🎯 Sobre o Projeto

O **Hermes** é uma evolução de um antigo projeto pessoal (`mailsender`), projetado para atuar como um **gateway centralizado de e-mails transacionais** em infraestruturas organizacionais ou acadêmicas (como no IFRO - Vilhena).

Diferente de soluções legadas e monolíticas, o Hermes separa o processamento de regras de negócio e o envio de e-mails em uma **API REST em Node.js/TypeScript** conectada a um **Worker assíncrono (BullMQ/Redis)**. O ecossistema oferece ainda:

- Uma interface administrativa em **Next.js** com controle completo de serviços, credenciais SMTP e templates MJML.
- O **`hermes-client`**, um SDK TypeScript oficial para integração simplificada, com rotação automática de API Keys.

---

## ⚙️ Arquitetura do Sistema

O ecossistema Hermes é composto por quatro blocos principais:

```
 ┌────────────────────────────────────────────────────────────────────┐
 │              APLICAÇÕES CLIENTE (hermes-client SDK)                │
 │     Portal de Notícias, Sistema Acadêmico, Qualquer App Node.js    │
 └────────────────────────────────────┬───────────────────────────────┘
         (POST /api/emails + X-API-Key)│  (Webhook Rotação de Chaves)
                                       ▼
                   ┌─────────────────────────────────────┐
                   │          HERMES FRONTEND            │
                   │   Dashboard Administrativo (React)  │
                   └───────┬──────────────────────▲──────┘
          (Sessão Cookie / │                      │ (Server-Sent Events -
             Bearer Token) ▼                      │  Atualização em Tempo Real)
                   ┌──────────────────────────────┴──────┐
                   │             HERMES API              │
                   │       Express REST Gateway          │
                   └──────┬───────────────────────┬──────┘
                          │                       │
      (Registra e-mail    │                       │ (Enfileira Job no Redis e
       como 'pending')    ▼                       ▼  Dispara Evento SSE)
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │        POSTGRES DB        │           │        REDIS CACHE        │
    │  Persistência (Drizzle)   │           │   Fila de E-mails / Jobs  │
    └───────────────────────────┘           └─────────────┬─────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │       HERMES WORKER       │
                                            │   Background Email Job    │
                                            └─────────────┬─────────────┘
                                                          │ (Disparo de E-mail)
                                                          ▼
                                            ┌───────────────────────────┐
                                            │       SERVIDOR SMTP       │
                                            │ (Gmail Plain / XOAUTH2)   │
                                            └───────────────────────────┘
```

---

## ✨ Principais Funcionalidades

### 🏢 Multi-Serviço (Multi-Tenant)
- Isolamento lógico de dados por **Serviços** (namespaces ou aplicativos cadastrados).
- Cada serviço possui chaves de API, templates, logs e configurações completamente independentes.

### 🔑 API Keys Inteligentes & Seguras
- Autenticação via header `X-API-Key`.
- Chaves geradas no formato `hm_[prefixo_público].[segredo_aleatório]`.
- Armazenamento seguro com hash de mão única **Argon2id** (resistente a brute-force e timing attacks).
- Indexação rápida no PostgreSQL pelo prefixo público de 8 caracteres hexadecimais.
- **Rotação Automática:** Job diário (BullMQ) analisa datas de validade e rotaciona chaves de forma transparente.
- **Webhooks Assinados:** Payloads assinados via HMAC SHA-256 notificam sistemas integrados sobre rotações iminentes.

### 📧 SMTP Dinâmico & Google OAuth2
- Suporte a múltiplos remetentes e servidores SMTP.
- Autenticação SMTP tradicional (senha ou App Password criptografada com AES-256-GCM).
- **Google OAuth2 (Gmail API):** autorize e revogue acesso de envio diretamente pelo painel; tokens renovados dinamicamente em background pelo Worker.

### 🎨 Templates MJML com Monaco Editor
- E-mails 100% responsivos via templates escritos em **MJML**.
- Injeção dinâmica de variáveis com **Handlebars** (`{{nome}}`).
- Editor integrado ao Frontend com preview em tempo real.

### 📦 SDK Oficial (`hermes-client`)
- Pacote NPM `@ruanlopes1350/hermes-client` com **interface fluida (Builder pattern)**.
- **Rotação de API Keys com zero-downtime:** middlewares plug-and-play para Express, Next.js e Fastify.
- **Storage Adapters** intercambiáveis (`MemoryAdapter`, `EnvAdapter` ou customizados) para persistir a chave entre reinicializações.

### ⚡ Tempo Real & Alta Performance
- **Server-Sent Events (SSE):** status dos e-mails e métricas do dashboard atualizados em tempo real.
- **Throttling/Debounce Engine:** agrupamento de eventos do Redis Pub/Sub com despacho cadenciado (máx. 2 atualizações/segundo).
- **Fila BullMQ:** retentativas exponenciais, concorrência configurável e atrasos de jobs.
- **Auto-scaling do Worker:** o módulo `scaler.ts` detecta a carga da CPU/RAM e ajusta dinamicamente o número de réplicas do Worker via Docker Compose.

---

## 🛠️ Tecnologias Utilizadas

### Backend (`hermes-api` & Workers)

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Node.js** | 20+ | Plataforma de execução |
| **TypeScript** | 5.9 | Tipagem estática |
| **Express** | 5.2 | Servidor HTTP / API REST |
| **Drizzle ORM** | 0.45 | ORM e migrations |
| **PostgreSQL** | 15 | Banco de dados relacional |
| **Redis** | Alpine | Fila de jobs e cache |
| **BullMQ** | 5 | Filas e workers assíncronos |
| **Better Auth** | 1.5 | Autenticação de usuários |
| **Nodemailer** | 8 | Envio de e-mails via SMTP |
| **Google APIs** | - | OAuth2 (Gmail API) |
| **MJML** | 4.18 | Templates de e-mail responsivos |
| **Handlebars** | 4.7 | Template engine (variáveis dinâmicas) |
| **Argon2** | - | Hash de API Keys |
| **Node Crypto** | - | AES-256-GCM (senhas SMTP) |

---

## 📁 Estrutura do Repositório

```
hermes-api/
├── src/
│   ├── config/             # Configurações do banco (Drizzle/Postgres) e Redis
│   ├── controller/         # Controladores das rotas Express
│   ├── docs/               # Documentação Swagger (gerada via npm run docs:generate)
│   ├── middlewares/        # Validação de API Keys, rate limits e tratamento de erros
│   ├── queue/              # Filas e Workers BullMQ
│   │   ├── emailQueue.ts   # Definição da fila de e-mails
│   │   ├── emailWorker.ts  # Worker de envio de e-mails
│   │   ├── systemWorker.ts # Worker de tarefas do sistema (rotação de chaves, etc.)
│   │   └── queueEvents.ts  # Listeners de eventos de fila (SSE bridge)
│   ├── repository/         # Queries SQL estruturadas (Drizzle)
│   ├── routes/             # Endpoints da aplicação
│   ├── seeds/              # Seeds de dados para ambiente de desenvolvimento
│   ├── service/            # Lógica de negócio principal
│   ├── types/              # Tipos TypeScript compartilhados
│   ├── utils/              # Auxiliares de criptografia, auth e renderização
│   ├── server.ts           # Ponto de entrada da API REST
│   ├── worker.ts           # Ponto de entrada do Email Worker
│   ├── system.ts           # Ponto de entrada do System Worker (jobs agendados)
│   └── scaler.ts           # Auto-scaling de workers via Docker Compose
├── drizzle/                # Migrations geradas pelo Drizzle Kit
├── docker-compose.yml      # Orquestração completa (Postgres, Redis, API, Worker, Scaler)
├── dockerfile              # Dockerfile multi-stage para produção
└── .env.example            # Modelo de variáveis de ambiente
```

> **Nota:** O `docker-compose.yml` orquestra todos os serviços em produção. Em desenvolvimento local, use `docker compose up -d db redis` para subir apenas o **Postgres** e o **Redis** via Docker, e rode a API e o Worker diretamente com `npm run dev:api` e `npm run dev:worker`.

---

## 🔑 Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável | Descrição | Obrigatória |
|---|---|---|
| `PORT` | Porta da API (padrão: `3001`) | Sim |
| `DATABASE_URL` | Connection string do PostgreSQL | Sim |
| `REDIS_HOST` / `REDIS_PORT` | Endereço do Redis | Sim |
| `AUTH_SECRET` | Segredo do Better Auth (32+ chars) | Sim |
| `AUTH_BASE_URL` | URL base da API (ex: `http://localhost:3001`) | Sim |
| `AUTH_TRUSTED_ORIGINS` | Origens permitidas para CORS/Auth (ex: `http://localhost:3000`) | Sim |
| `MASTER_KEY` | Chave mestra AES-256-GCM para criptografia | Sim |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciais do usuário admin (lidas na inicialização do servidor) | Sim |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciais do Google OAuth2 | Opcional |
| `MAX_WORKERS_OVERRIDE` | Limita manualmente o teto de réplicas do Worker | Opcional |

---

## 🚀 Como Iniciar (Desenvolvimento Local)

Certifique-se de ter o **Docker**, **Docker Compose** e **Node.js v20+** instalados.

### 1. Configurar variáveis de ambiente
```bash
cd hermes-api
cp .env.example .env
# Edite o .env com suas credenciais
```

### 2. Subir a infraestrutura base (Postgres + Redis)
```bash
docker compose up -d db redis
```

### 3. Aplicar o schema e popular o banco

> **⚠️ Atenção:** O comando `npm run seed` **só funciona em `NODE_ENV=development`**. Ele **apaga todos os dados existentes** (TRUNCATE em cascata) e repopula o banco com um conjunto de dados de demonstração (usuários, serviços, templates e e-mails fictícios). Use-o apenas para configurar um ambiente de desenvolvimento do zero.

```bash
npm run db:push   # Aplica o schema via Drizzle
npm run seed      # Popula o banco com dados de demo (apaga tudo antes!)
```

### 4. Iniciar a API e os Workers (terminais separados)
```bash
# Terminal 1 - API REST (porta definida em PORT, padrão 3001):
npm run dev:api

# Terminal 2 - Worker de envio de e-mails:
npm run dev:worker

# Terminal 3 (opcional) - System Worker (jobs agendados: rotação de chaves):
# npm run start:system-worker
```

### 5. Iniciar o Frontend
```bash
cd ../hermes-front
cp .env.example .env
# Edite o .env: NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
# Acesse http://localhost:3000
```

> Para o fluxo completo de uso da plataforma, consulte o [📖 Tutorial](TUTORIAL.md).

---

## 📜 Scripts Disponíveis

| Script | Descrição |
|---|---|
| `npm run dev:api` | Inicia a API em modo watch (tsx) |
| `npm run dev:worker` | Inicia o Email Worker em modo watch |
| `npm run build` | Gera docs Swagger e compila TypeScript |
| `npm run start:api` | Inicia a API compilada (produção) |
| `npm run start:worker` | Inicia o Worker compilado (produção) |
| `npm run start:system-worker` | Inicia o System Worker (jobs agendados) |
| `npm run start:scaler` | Inicia o módulo de auto-scaling |
| `npm run seed` | Popula banco com dados de demo **[somente development - apaga dados!]** |
| `npm run db:push` | Aplica o schema no banco (Drizzle) |
| `npm run db:generate` | Gera migrations a partir do schema |
| `npm run db:studio` | Abre o Drizzle Studio (UI do banco) |
| `npm run db:up` | Sobe todos os serviços via Docker Compose |
| `npm run db:down` | Para e remove os containers |
| `npm run docs:generate` | Gera o arquivo `swagger-output.json` |
| `npm run format:fix` | Formata o código com Prettier |

---

## 🔒 Segurança

O Hermes implementa as melhores práticas de segurança para microsserviços:

1. **Criptografia de Senhas SMTP:** As senhas e tokens de refresh do Google OAuth2 são armazenados com **AES-256-GCM**, usando uma chave mestra (`MASTER_KEY`) que nunca sai do servidor.
2. **Hash de API Keys:** Nenhuma chave é salva em texto limpo. O banco armazena apenas hashes gerados com **Argon2id**.
3. **Isolamento de Tenant:** O middleware garante que uma API Key de um serviço jamais acesse recursos de outro serviço.
4. **Rate Limiting:** Proteção ativa contra abuso nos endpoints de e-mail e templates (Redis-backed).
5. **Webhooks Assinados (HMAC SHA-256):** Webhooks de rotação de chaves são assinados digitalmente; o SDK `hermes-client` valida a assinatura automaticamente antes de aceitar uma nova chave.

> Para detalhes sobre o sistema de autenticação, consulte [🔐 AUTHENTICATION.md](AUTHENTICATION.md).

---

Desenvolvido por [Ruan Lopes](https://github.com/RuanLopes1350). Licença ISC.
