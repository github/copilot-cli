FROM node:20-alpine AS builder

WORKDIR /app/evodron

COPY evodron/package*.json ./
COPY evodron/packages/api/package.json ./packages/api/package.json
COPY evodron/packages/cli/package.json ./packages/cli/package.json
COPY evodron/packages/db/package.json ./packages/db/package.json
COPY evodron/packages/shared/package.json ./packages/shared/package.json

RUN npm ci

COPY evodron/ ./

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app/evodron

COPY evodron/package*.json ./
COPY evodron/packages/api/package.json ./packages/api/package.json
COPY evodron/packages/cli/package.json ./packages/cli/package.json
COPY evodron/packages/db/package.json ./packages/db/package.json
COPY evodron/packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/evodron/packages/api/dist ./packages/api/dist
COPY --from=builder /app/evodron/packages/db/dist ./packages/db/dist
COPY --from=builder /app/evodron/packages/shared/dist ./packages/shared/dist

VOLUME ["/data"]
ENV EVODRON_DB_URL=file:/data/evodron.db
ENV EVODRON_API_HOST=0.0.0.0
ENV EVODRON_API_PORT=3000

EXPOSE 3000

USER node

CMD ["sh", "-c", "npm run db:migrate && npm run start --workspace=@evodron/api"]
