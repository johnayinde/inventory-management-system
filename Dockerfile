# stage 1 building the code

FROM node:18-alpine as builder

WORKDIR /usr/app

COPY package*.json ./
COPY yarn.lock ./

COPY ./prisma ./prisma

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build



# stage 2

FROM node:18-alpine

WORKDIR /usr/app

COPY . .

COPY --from=builder /usr/app/dist ./dist

COPY --from=builder /usr/app/node_modules ./node_modules

COPY --from=builder /usr/app/package*.json ./

COPY --from=builder  /usr/app/prisma ./prisma

EXPOSE 8080


CMD  node dist/main.js
