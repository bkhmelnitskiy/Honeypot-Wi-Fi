# Stage: Development
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# Stage: Build
FROM dev AS builder

RUN npm run build

# Stage: Production
FROM node:20-alpine AS prod

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
