FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
