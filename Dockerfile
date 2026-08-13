# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
RUN mkdir -p /app/data

# Persistent volume for user data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]
