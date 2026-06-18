# Hermes API ✉️

A **hermes-api** é o backend e core do ecossistema **Hermes**, um Gateway de E-mails Transacionais auto-hospedável. Ela atua como um microsserviço que desacopla o envio de e-mails das suas aplicações de negócio, centralizando a gestão de credenciais, templates (MJML) e filas assíncronas.

## 🚀 Principais Tecnologias

- **Node.js & Express**: Framework web rápido e minimalista.
- **TypeScript**: Tipagem estática para maior confiabilidade.
- **BullMQ & Redis**: Fila de trabalhos de alta performance com suporte a priorização e retentativas exponenciais, além de envio de métricas em tempo real via Server-Sent Events (SSE) otimizado por debounce/throttling.
- **PostgreSQL & Drizzle ORM**: Banco de dados relacional robusto com ORM typesafe.
- **Better Auth**: Autenticação moderna e segura para os painéis de administração.
- **MJML & Handlebars**: Para templates responsivos e injeção dinâmica de variáveis.
- **Criptografia Avançada**: Cifras AES-256-GCM para senhas e tokens SMTP/OAuth, e hashes Argon2id para validação das chaves de API (`hm_prefix.secret`).

## ⚙️ Pré-requisitos

- Node.js (v18+)
- Docker e Docker Compose (para rodar a stack de banco e filas localmente)
- Uma conta Google (caso queira usar OAuth2/App Passwords) ou outro servidor SMTP.

## 🛠️ Como executar localmente

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Configure as Variáveis de Ambiente**:
   Copie o arquivo `.env.example` para `.env` e preencha as variáveis corretamente (incluindo as chaves do banco de dados e Redis, bem como as chaves do Google OAuth caso aplique).
   ```bash
   cp .env.example .env
   ```

3. **Suba a infraestrutura base (Postgres + Redis)**:
   (Utilize o script disponível no `package.json` ou suba via `docker-compose` manualmente):
   ```bash
   npm run db:up
   ```

4. **Prepare o Banco de Dados (Migrações e Seeds)**:
   ```bash
   npm run db:push
   # ou npm run db:migrate (dependendo da sua estrutura de drizzle)
   npm run seed
   ```

5. **Inicie a API e o Worker**:
   O Hermes possui duas partes fundamentais que devem rodar simultaneamente:
   - **API**: Recebe as requisições e enfileira no Redis.
   - **Worker**: Consome a fila, processa templates e envia o e-mail.

   Em abas de terminal separadas:
   ```bash
   npm run dev:api
   npm run dev:worker
   ```

## 📚 Documentação (Swagger)

A documentação interativa das rotas pode ser gerada e acessada. Por padrão, após gerar os docs via:
```bash
npm run docs:generate
```
A documentação da API estará disponível através da rota correspondente gerada pelo Swagger UI.

---

## Legenda de Logs do Sistema (Padrão Chalk)

### Estrutura Padrão do Log

```txt
[HH:MM:SS] [TAG] Contexto/Mensagem - Dados Adicionais (opcional)
```

### 1. Níveis de Severidade e Avisos

| Tag      | Cor (Chalk)                | Uso                                                                 |
|----------|---------------------------|---------------------------------------------------------------------|
| **ERROR**   | Vermelho Negrito (`chalk.red.bold`)   | Erros críticos que interrompem o fluxo (ex: falhas de conexão, exceções não tratadas, status 500) |
| **WARN**    | Amarelo Negrito (`chalk.yellow.bold`) | Alertas de situações anormais que não quebram a API (ex: senha incorreta, funções depreciadas, retries) |
| **INFO**    | Azul/Ciano (`chalk.blue.bold` / `chalk.cyan.bold`) | Mudanças de estado do sistema e informações gerais (ex: servidor iniciado, serviços carregados) |
| **SUCCESS** | Verde Negrito (`chalk.green.bold`)    | Operações vitais concluídas com êxito (ex: conexão estabelecida, registros criados, migrações finalizadas) |

### 2. Contextos Específicos (Desenvolvimento)

| Tag      | Cor (Chalk)                | Uso                                                                 |
|----------|---------------------------|---------------------------------------------------------------------|
| **DB**      | Magenta/Roxo (`chalk.magenta.bold`)   | Execução de queries, sincronização de modelos, operações diretas de leitura/escrita no banco |
| **DEBUG**   | Cinza (`chalk.gray`)                  | Inspeção profunda de código, exibição de payloads, variáveis temporárias, rastreamento passo a passo |

### 3. Requisições HTTP (Roteamento)

**Estrutura:**
```txt
[MÉTODO] /caminho/da/rota - STATUS_CODE TempoDeResposta
```

**Cores por Status Code:**
- `2xx` (Sucesso): **Verde** (`chalk.green`)
- `3xx` (Redirecionamento): **Ciano** (`chalk.cyan`)
- `4xx` (Erro do Cliente): **Amarelo** (`chalk.yellow`)
- `5xx` (Erro do Servidor): **Vermelho** (`chalk.red`)