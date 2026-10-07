#!/bin/sh
# Démarrage de l'image Docker : contrôle de configuration, migrations, données de démo éventuelles, serveur.
set -e
node scripts/preflight.mjs

# La base peut ne pas être joignable dans les premières secondes (réseau privé de l'hébergeur,
# base qui démarre en même temps que l'app) : on réessaie les migrations avant d'abandonner.
attempt=1
until node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma; do
  if [ "$attempt" -ge 10 ]; then
    echo "[Palette] Migrations impossibles après $attempt tentatives : vérifiez DATABASE_URL et que la base PostgreSQL est démarrée." >&2
    exit 1
  fi
  echo "[Palette] Base injoignable (tentative $attempt/10), nouvel essai dans 3 s…"
  attempt=$((attempt + 1))
  sleep 3
done

node dist/demo-on-empty.cjs
echo "[Palette] Démarrage du serveur sur le port ${PORT:-3000}…"
exec node server.js
