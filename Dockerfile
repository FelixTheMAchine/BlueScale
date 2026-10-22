FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
ENV DATABASE_URL="postgresql://bluescale:bluescale_local@db:5432/bluescale?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
