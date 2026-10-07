# Image de production (Railway, Render, Fly.io, Scaleway, serveur TGE…).
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build \
  # Script de démonstration autonome (voir prisma/demo-on-empty.ts), sans dépendre de tsx en production
  && npx esbuild prisma/demo-on-empty.ts --bundle --platform=node --format=cjs --target=node22 \
     --external:@prisma/client --external:sharp --external:@aws-sdk/client-s3 --outfile=dist/demo-on-empty.cjs \
  # CLI Prisma (même version que le projet) installée à part, pour appliquer les migrations au démarrage
  && npm install --prefix /app/prisma-cli --no-audit --no-fund "prisma@$(node -p "require('./node_modules/prisma/package.json').version")"

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/preflight.mjs /app/scripts/start.sh ./scripts/
COPY --from=build /app/prisma-cli /opt/prisma-cli
# Client Prisma généré (le moteur de requêtes) pour le serveur et le script de démo
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/storage
EXPOSE 3000
# Contrôle de configuration, migrations, données de démo si SEED_DEMO=true et base vide, puis serveur
CMD ["sh", "scripts/start.sh"]
