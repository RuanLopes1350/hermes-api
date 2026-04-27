FROM node:22

EXPOSE 1350

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Removido o CMD fixo para permitir que o docker-compose defina
# se este container será uma 'api' ou um 'worker'.
