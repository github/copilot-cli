FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY app.js ./
COPY src/ ./src/
COPY public/ ./public/

# SQLite database volume mount point
VOLUME ["/data"]
ENV DB_PATH=/data/evodron.db

EXPOSE 3000

USER node

CMD ["node", "app.js"]
