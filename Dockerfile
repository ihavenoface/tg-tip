FROM node:18-alpine as ts-compiler
RUN apk add git python3 alpine-sdk zeromq-dev
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:18-alpine as ts-remover
RUN apk add python3 alpine-sdk zeromq-dev
WORKDIR /app
COPY --from=ts-compiler /app/package*.json ./
COPY --from=ts-compiler /app/dist .
RUN npm install --only-production
RUN npm rebuild --build-from-source

FROM node:18-alpine
WORKDIR /app
COPY --from=ts-remover /app ./
USER node
