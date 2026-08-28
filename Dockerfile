FROM node:26-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --include=dev --ignore-scripts

FROM deps AS build
COPY . .
RUN npm run build:api
RUN npm prune --omit=dev

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "dist/apps/api/src/server.js"]
