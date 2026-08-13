# 🕊️ Hermes - Sistema de Envio de E-mails Transacionais

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2+-red.svg)](https://expressjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0+-blue.svg)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle--ORM-0.45+-yellowgreen.svg)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-alpine-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

**Plataforma profissional e escalável para envio de e-mails transacionais (Gateway de E-mails) com suporte a múltiplos serviços, templates MJML dinâmicos, fila de processamento assíncrono e painel administrativo moderno.**

[📖 Tutorial](TUTORIAL.md) • [🔐 Autenticação](docs/AUTHENTICATION.md) • [📄 Especificação do Projeto](PROJETO.md) <br>
[Painel Frontend](https://github.com/RuanLopes1350/hermes-front) • [Pacote Client (NPM)](https://github.com/RuanLopes1350/hermes-client)

</div>

---

## 📋 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Como Iniciar (Desenvolvimento Local)](#-como-iniciar-desenvolvimento-local)
- [Segurança](#-segurança)

---

## 🎯 Sobre o Projeto

O **Hermes** é uma evolução de um antigo projeto pessoal, genericamente nomeado de `mailsender`. Ele foi projetado para atuar como um gateway centralizado de e-mails transacionais em infraestruturas organizacionais ou acadêmicas (como no IFRO - Vilhena).

Diferente de soluções legadas e monolíticas, o Hermes separa totalmente o processamento de regras de negócios e envio de e-mails em uma **API em Node.js com TypeScript** conectada a um **Worker assíncrono (BullMQ/Redis)**, expõe uma interface gráfica rica e reativa em **Next.js 16.2 (App Router)** com controle refinado de múltiplos aplicativos (serviços), credenciais SMTP dinâmicas (com suporte a Google OAuth2) e criação de templates MJML em tempo real com Monaco Editor. Adicionalmente, oferece o **`hermes-client`**, um SDK TypeScript oficial para integração simplificada com rotação automática de API Keys.

---

## ⚙️ Arquitetura do Sistema

O ecossistema do Hermes é composto por quatro blocos principais:

```
 ┌────────────────────────────────────────────────────────────────────┐
 │              APLICAÇÕES CLIENTE (hermes-client SDK)                │
 │     Portal de Notícias, Sistema Acadêmico, Qualquer App Node.js    │
 └────────────────────────────────────┬───────────────────────────────┘
         (POST /emails + X-API-Key)   │   (Webhook Rotação de Chaves)
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
* Isolamento lógico de dados por **Serviços** (namespaces ou aplicativos cadastrados).
* Cada serviço tem suas próprias chaves de API, templates, logs de e-mails e configurações de segurança independentes.

### 🔑 API Keys Inteligentes & Seguras
* Autenticação via header `X-API-Key`.
* Chaves geradas no formato `hm_[prefixo_publico].[segredo_aleatorio]`.
* Armazenamento seguro utilizando hash de mão única **Argon2** (resistente a brute-force e timing attacks).
* Indexação rápida no banco PostgreSQL utilizando o prefixo público de 8 caracteres hexadecimais.
* **Rotação Automática:** Job diário agendado no BullMQ analisa datas de validade e rotaciona chaves de forma transparente.
* **Webhooks de Integração:** O Hermes dispara payloads assinados via HMAC SHA-256 informando sistemas integrados sobre rotações de chaves ou expirações iminentes.

### 📧 SMTP Dinâmico & Autenticação Google OAuth2
* Suporte a múltiplos remetentes e servidores SMTP.
* Suporte a autenticação SMTP tradicional (Plain Text com senha ou App Password criptografada por AES-256-GCM).
* Integração completa com o **Google OAuth2 (Gmail API)**: Permite autorizar e revogar o acesso de envio de e-mails diretamente pela interface administrativa, renovando tokens dinamicamente em background no Worker.

### 🎨 Criação de Templates MJML
* Criação de e-mails responsivos através de templates escritos em **MJML**.
* Injeção dinâmica de variáveis em tags MJML utilizando compilação prévia via **Handlebars** (ex: `{{nome}}`).
* Editor integrado no Frontend utilizando **Monaco Editor** com preview em tempo real.

### 📦 SDK Oficial (`hermes-client`)
* Pacote NPM (`@ruanlopes1350/hermes-client`) com **interface fluida (Builder pattern)** para envio de e-mails.
* **Rotação de API Keys com zero-downtime**: Middlewares plug-and-play para Express, Next.js e Fastify que atualizam a chave automaticamente ao receber webhooks assinados do Hermes.
* **Storage Adapters** intercambiáveis (`MemoryAdapter`, `EnvAdapter` ou customizados, ex: `RedisAdapter`) para persistir a chave entre reinicializações.

### ⚡ Tempo Real e Alta Performance
* **Server-Sent Events (SSE):** O frontend recebe o status dos e-mails processados e métricas do dashboard em tempo real via stream HTTP unidirecional.
* **Throttling/Debounce Engine:** O Node.js protege seus recursos agrupando enxurradas de eventos do Redis Pub/Sub e despachando pacotes SSE de forma cadenciada (ex: máximo de 2 atualizações por segundo).
* **Fila com BullMQ:** Controle absoluto sobre retentativas exponenciais, concorrência de workers e atrasos (delay) de jobs.

---

## 🛠️ Tecnologias Utilizadas

### Backend (`hermes-api` & Worker embutido)
* **Plataforma:** Node.js (v20+) & TypeScript 5.9
* **Servidor HTTP:** Express v5.2
* **ORM:** Drizzle ORM v0.45
* **Banco de Dados Relacional:** PostgreSQL 15
* **Fila & Cache:** Redis Alpine & BullMQ v5
* **Autenticação de Usuários:** Better Auth v1.5
* **Envio de E-mails:** Nodemailer & Google APIs (OAuth2)
* **Template Engine:** MJML v4.18 & Handlebars v4.7
* **Criptografia & Hash:** Argon2 & Node Crypto (AES-256-GCM)

### Frontend (`hermes-front`)
* **Framework:** Next.js 16.2 (App Router)
* **Biblioteca UI:** React 19 & Radix UI Primitives & shadcn/ui
* **Estilização:** Tailwind CSS v4
* **Gráficos e Analytics:** ECharts (`echarts-for-react`)
* **Editor de Código:** Monaco Editor (`@monaco-editor/react`)
* **Autenticação:** Better Auth (compartilhado com a API)

### SDK Cliente (`hermes-client`)
* **Pacote NPM:** `@ruanlopes1350/hermes-client` v1.2
* **Plataforma:** Node.js & Edge Runtimes (TypeScript)
* **Build:** tsup (ESM + CJS)
* **Handlers de Webhook:** Express, Next.js App Router, Fastify

---

## 📁 Estrutura do Repositório

```
hermes/
├── hermes-api/                 # Backend (API REST + Worker BullMQ)
│   ├── src/
│   │   ├── config/             # Configurações do Banco (Drizzle/Postgres) e Redis
│   │   ├── controller/         # Controladores das rotas Express
│   │   ├── docs/               # Documentação Swagger (gerada via npm run docs:generate)
│   │   ├── middlewares/        # Validação de API Keys, rate limits e erros
│   │   ├── queue/              # Filas e Workers do BullMQ (envio de e-mails e rotação de chaves)
│   │   ├── repository/         # Queries SQL estruturadas (Drizzle)
│   │   ├── routes/             # Endpoints da aplicação
│   │   ├── seeds/              # Seeds para o banco de dados
│   │   ├── service/            # Lógica de negócio principal
│   │   ├── types/              # Tipos TypeScript compartilhados
│   │   ├── utils/              # Auxiliares de criptografia, auth e renderização
│   │   ├── server.ts           # Ponto de entrada da API
│   │   └── worker.ts           # Ponto de entrada do Worker
│   ├── drizzle/                # Migrations geradas pelo Drizzle Kit
│   ├── docker-compose.yml      # Orquestração local (Postgres + Redis)
│   ├── dockerfile              # Dockerfile para produção da API/Worker
│   └── .env.example            # Modelo de variáveis de ambiente
│
├── hermes-front/               # Frontend (Painel Administrativo Web)
│   ├── src/
│   │   ├── app/                # Páginas e roteamento do Next.js (App Router)
│   │   ├── components/         # UI Design System (shadcn/Radix/Tailwind v4)
│   │   ├── constants/          # Constantes globais da aplicação
│   │   ├── hooks/              # React hooks customizados
│   │   ├── lib/                # Integração com Better Auth e API Client
│   │   └── types/              # Tipos TypeScript do frontend
│   └── dockerfile              # Dockerfile com multi-stage build
│
└── hermes-client/              # SDK NPM oficial para aplicações integradas
    ├── src/
    │   ├── frameworks/         # Handlers de Webhook (Express, Next.js, Fastify)
    │   ├── storage/            # Storage Adapters (MemoryAdapter, EnvAdapter)
    │   ├── client.ts           # HermesClient principal
    │   ├── builder.ts          # Email Builder (interface fluida)
    │   ├── bulkEmailBuilder.ts # Bulk Email Builder
    │   ├── errors.ts           # Classes de erro tipadas
    │   └── types.ts            # Tipos públicos do SDK
    └── tsup.config.ts          # Build config (ESM + CJS)
```

> **Nota:** O `docker-compose.yml` principal está dentro de `hermes-api/` e provisiona apenas o **banco de dados (Postgres)** e o **Redis**. A API, o Worker e o Frontend são executados em modo de desenvolvimento com `npm run dev:api`, `npm run dev:worker` e `npm run dev` respectivamente, ou via `dockerfile` individual em produção.

---

## 🚀 Como Iniciar (Desenvolvimento Local)

Certifique-se de ter o **Docker**, **Docker Compose** e **Node.js v20+** instalados.

### 1. Configurar Variáveis de Ambiente da API
```bash
cd hermes-api
cp .env.example .env
# Edite o .env com suas credenciais de banco e configurações
```

### 2. Subir a infraestrutura base (Postgres + Redis)
```bash
# Dentro de hermes-api/:
npm run db:up
```

### 3. Preparar o banco de dados
```bash
npm run db:push   # Aplica o schema via Drizzle
npm run seed      # Cria o usuário administrador inicial
```

### 4. Iniciar a API e o Worker (terminais separados)
```bash
# Terminal 1 — API (porta 3001):
npm run dev:api

# Terminal 2 — Worker de e-mails:
npm run dev:worker
```

### 5. Iniciar o Frontend
```bash
cd ../hermes-front
# Crie o .env apontando para a API:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env
npm install
npm run dev
# Acesse http://localhost:3000
```

---

## 🔒 Segurança

O Hermes implementa as melhores práticas de segurança de dados para microsserviços:
1. **Criptografia de Senhas de Envio:** As senhas SMTP (Passkeys) e os Tokens de Refresh do Google OAuth2 são armazenados criptografados com o algoritmo simétrico **AES-256-GCM**, utilizando uma chave secreta mestra (`MASTER_KEY`) que nunca deixa o ambiente do servidor.
2. **Proteção por Hash de API Keys:** Nenhuma chave de API de desenvolvedor é salva em texto limpo. O banco armazena apenas hashes gerados com o **Argon2id**.
3. **Isolamento de Tenant:** O middleware de rotas garante que uma requisição feita com a API Key de um determinado serviço jamais possa acessar ou usar recursos de outros serviços cadastrados no banco de dados.
4. **Rate Limiting:** Proteção ativa contra abuso de requisições nos endpoints de e-mail e templates usando o Redis.
5. **Webhooks Assinados (HMAC SHA-256):** Todos os webhooks de rotação de chaves emitidos pelo Hermes são assinados digitalmente, e o SDK `hermes-client` valida a assinatura automaticamente antes de aceitar uma nova chave.

---
Desenvolvido por [Ruan Lopes](https://github.com/RuanLopes1350). Licença ISC.
