FROM node:22-alpine

# docker-cli + plugin compose: necessários só pro processo "scaler" (Passo 4),
# mas como as 4 réplicas (api/email-worker/system-worker/scaler) usam esta mesma
# imagem, instalamos aqui.
RUN apk add --no-cache docker-cli docker-cli-compose

EXPOSE 1350

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build