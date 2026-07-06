# 📚 Tutorial: Como Configurar e Usar o Hermes

Este tutorial é um guia prático passo a passo para colocar a infraestrutura do Hermes em execução, configurar as credenciais, criar templates MJML e efetuar disparos de e-mail de teste.

---

## 📋 Pré-requisitos

Para rodar o ecossistema completo localmente, certifique-se de possuir instalado:
* **Docker** e **Docker Compose** (para provisionar PostgreSQL e Redis localmente).
* **Node.js 20+** e **npm** (necessário para rodar a API, o Worker e o Frontend).
* Uma conta de e-mail para testes (Gmail com App Password ativa ou projeto configurado no console Google Cloud).

---

## 🚀 1. Configurando e Subindo a Infraestrutura Base

A forma recomendada de iniciar o Hermes em desenvolvimento usa o **Docker Compose** (dentro de `hermes-api/`) para provisionar o PostgreSQL e o Redis, enquanto a API, o Worker e o Frontend são executados diretamente com Node.js.

### Passo 1: Configurar as Variáveis de Ambiente da API
Acesse o diretório da API e crie o arquivo `.env`:
```bash
cd hermes-api
cp .env.example .env
```

Abra o arquivo `.env` e preencha as variáveis obrigatórias:
```env
PORT=3001
NODE_ENV=development
TZ=America/Manaus

# Banco de Dados PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hermes
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hermes

# Redis (Fila BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Credenciais do Primeiro Usuário Administrador (criado no seed)
ADMIN_NAME="Administrador Hermes"
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=SenhaForteSegura123

# Configurações do Better Auth
AUTH_SECRET=um_segredo_aleatorio_de_32_bytes_aqui
AUTH_BASE_URL=http://localhost:3001
AUTH_TRUSTED_ORIGINS=http://localhost:3000

# Chave Mestra para Criptografia (AES-256-GCM)
MASTER_KEY=uma_chave_mestra_secreta_AES_256_GCM_aqui
```

### Passo 2: Subir o banco de dados e o Redis
Ainda dentro de `hermes-api/`, execute:
```bash
npm run db:up
```
Este comando sobe o **Postgres** (porta `5432`) e o **Redis** (porta `6379`) via Docker Compose.

### Passo 3: Preparar o banco e criar o usuário admin
```bash
npm run db:push   # Aplica o schema (Drizzle)
npm run seed      # Cria o usuário administrador inicial
```

---

## 🛠️ 2. Executando os Microsserviços em Modo de Desenvolvimento

### Executando a API e o Worker

Abra **dois terminais** dentro de `hermes-api/`:

* **Terminal 1** — Inicia a API REST (porta `3001`):
  ```bash
  npm run dev:api
  ```
* **Terminal 2** — Inicia o Worker de envio de e-mails:
  ```bash
  npm run dev:worker
  ```

### Executando o Frontend

1. Em outro terminal, acesse a pasta `hermes-front`:
   ```bash
   cd hermes-front
   ```
2. Crie o arquivo `.env` com a URL da API:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
3. Instale as dependências e inicie o servidor Next.js:
   ```bash
   npm install
   npm run dev
   ```

---

## 💻 3. Usando a Plataforma (Fluxo Completo)

Com a API rodando na porta `3001` e o frontend na porta `3000`, siga os passos abaixo para configurar seu primeiro disparo.

### Passo 1: Efetuar Login
Acesse **`http://localhost:3000`** e faça login com as credenciais administrativas definidas no seu arquivo `.env` (campo `ADMIN_EMAIL` e `ADMIN_PASSWORD`).

### Passo 2: Criar um Serviço (Tenant Namespace)
1. No menu lateral, acesse **Serviços** e clique em **Novo Serviço**.
2. Dê um nome (ex: `Sistema de Vendas`) e clique em **Salvar**.
3. O serviço gerará um ID único (ex: `clxxxxxxx0000xxxx`). Salve este ID.

### Passo 3: Cadastrar Credenciais SMTP ou Google OAuth2
1. Dentro do serviço criado, clique na aba **Credenciais** e em **Nova Credencial**.
2. Preencha as configurações de disparo do servidor de e-mail:
   * **Método SMTP Tradicional:** Insira Host, Porta, Login (e-mail de envio) e a senha/App Password.
   * **Método Google OAuth2:**
     1. Insira seu Client ID e Client Secret criados no painel do Google Cloud Console.
     2. Clique em **Salvar**.
     3. Na listagem de credenciais, clique em **Autorizar** para abrir a tela de consentimento do Google e vincular sua conta Gmail de forma dinâmica.

### Passo 4: Criar um Template MJML
1. No menu esquerdo, acesse **Templates** e clique em **Novo Template**.
2. Escreva o conteúdo utilizando tags **MJML** (para garantir que seja 100% responsivo).
3. Você pode usar tags do Handlebars para injetar variáveis:
   ```xml
   <mjml>
     <mj-body>
       <mj-section>
         <mj-column>
           <mj-text font-size="20px" color="#333">Olá, {{nome}}!</mj-text>
           <mj-text>Seu código de ativação é: <strong>{{codigo}}</strong></mj-text>
         </mj-column>
       </mj-section>
     </mj-body>
   </mjml>
   ```
4. Visualize a renderização ao vivo do template no painel e clique em **Salvar**.

### Passo 5: Gerar uma API Key
1. Acesse a aba **API Keys** do seu serviço no painel e clique em **Gerar Nova Chave**.
2. Selecione a **Credencial de Envio** padrão associada a essa chave.
3. Defina um nome identificador e o prazo de expiração (opcional).
4. Clique em **Gerar**.
5. **⚠️ ATENÇÃO:** Copie a chave exibida (formato `hm_prefixo.segredo`), pois ela é armazenada apenas como hash e **não será exibida novamente** por motivos de segurança!

---

## ✉️ 4. Enviando E-mails Programaticamente

Com o ID do Serviço, o ID do Template e a sua API Key em mãos, sua aplicação externa está pronta para realizar disparos. Existem duas formas recomendadas.

### Opção A: Usando o SDK Oficial (`hermes-client`)

Instale o SDK no seu projeto:
```bash
npm install @ruanlopes1350/hermes-client
```

Configure e utilize:
```typescript
import { HermesClient, MemoryAdapter } from '@ruanlopes1350/hermes-client';

const hermes = new HermesClient({
  baseUrl: 'http://localhost:3001',
  storageAdapter: new MemoryAdapter('hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f'),
});

await hermes.email()
  .to('cliente@email.com')
  .subject('Confirmação de Registro')
  .useTemplate('cltmplxxxxxx0000xxxx', { nome: 'Carlos Silva', codigo: '9582' })
  .send();
```

### Opção B: Chamada Direta via cURL (ou qualquer HTTP client)

```bash
curl -X POST http://localhost:3001/api/services/clxxxxxxx0000xxxx/emails \
  -H "X-API-Key: hm_b5c92a10.e4d3c2b1a0f9e8d7c6b5a4938271605f" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_to": "cliente@email.com",
    "subject": "Confirmação de Registro",
    "template_id": "cltmplxxxxxx0000xxxx",
    "variables": {
      "nome": "Carlos Silva",
      "codigo": "9582"
    }
  }'
```

### Resposta de Sucesso (201 Created)
```json
{
  "success": true,
  "message": "E-mail enfileirado com sucesso!",
  "data": {
    "id": "clemailxxxxxx0000xxxx",
    "status": "pending",
    "recipient_to": "cliente@email.com"
  }
}
```

A API colocará o e-mail na fila de processamento assíncrono. Em segundos, o Worker lerá a tarefa, processará o template MJML com os dados, descriptografará as chaves SMTP e efetuará o envio, atualizando o status do registro no banco de dados para `sent` (ou `failed` em caso de erro definitivo).

Acompanhe as taxas de entrega, erros de envio e gráficos analíticos diretamente no Dashboard principal do console administrativo Hermes em **`http://localhost:3000`**.
