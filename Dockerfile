FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Keep development dependencies in the build stage: TypeScript (tsc) is a devDependency.
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --include=dev --ignore-scripts

FROM deps AS build
COPY . .
RUN npm run build:api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# Remove build-only dependencies from the final image.
RUN npm prune --omit=dev
EXPOSE 3000
CMD ["node", "dist/apps/api/src/server.js"]
