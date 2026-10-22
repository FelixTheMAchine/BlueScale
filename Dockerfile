FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
# O postinstall gera Prisma Client e precisa do schema disponível.
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN DATABASE_URL="postgresql://build:build@localhost:5432/bluescale_build?schema=public" npm install --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# URL estritamente fictícia só durante compilação. Nunca fica como padrão no contêiner.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/bluescale_build?schema=public" npm run build
EXPOSE 3000
# Banco real e segredo devem vir do Railway; migração e bootstrap idempotente na inicialização.
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ] || [ \"\u0024{#NEXTAUTH_SECRET}\" -lt 32 ]; then echo 'Configure DATABASE_URL e NEXTAUTH_SECRET (32+ caracteres)' >&2; exit 1; fi; npx prisma migrate deploy && npm run db:bootstrap && npm run start"]
