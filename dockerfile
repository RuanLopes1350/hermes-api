# --- ESTÁGIO DE CONSTRUÇÃO ---
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# Instala TODAS as dependências (incluindo as de desenvolvimento)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código-fonte e compila para JavaScript (dist/)
COPY . .
RUN npm run build

# Remove as dependências de desenvolvimento para economizar espaço
RUN npm prune --omit=dev

# --- ESTÁGIO DE PRODUÇÃO ---
FROM node:22-alpine AS runner
WORKDIR /usr/src/app

# Dependências exigidas pelo serviço "scaler"
RUN apk add --no-cache docker-cli docker-cli-compose

# Copia APENAS o código compilado e dependências de produção do estágio anterior
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 1350

# O docker-compose define o CMD (ex: ["npm", "run", "start:api"]) 
# através dos perfis de serviço, então não precisamos definir aqui.
