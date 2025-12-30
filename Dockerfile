FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies
RUN yarn install --legacy-peer-deps

# install openssl
RUN set -ex; \
    apk update; \
    apk add --no-cache \
    openssl

COPY . .

RUN yarn run build

FROM node:18-alpine
RUN set -ex; \
    apk update; \
    apk add --no-cache \
    openssl
    
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000
CMD [ "yarn", "run", "start:prod" ]