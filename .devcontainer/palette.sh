#!/usr/bin/env bash
# Palette dans GitHub Codespaces (instance de test, données de démonstration).
#   palette.sh prepare : à la création du codespace (dépendances, base, données de démo, compilation)
#   palette.sh start   : à chaque ouverture (mise à jour si possible, puis lancement sur le port 3000)
# Chaque étape est idempotente : relancer le script ne refait que ce qui manque.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3000
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"

log() { printf '\n\033[1;35m[Palette]\033[0m %s\n' "$*"; }

load_env() {
  if [ ! -f .env ]; then
    log "Création de la configuration locale (.env)…"
    cat > .env <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/palette"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
STORAGE_DRIVER="local"
LOCAL_STORAGE_DIR="./storage"
SEED_DEMO="true"
EOF
  fi
  set -a
  . ./.env
  set +a
  # Le partage de port de Codespaces réécrit l'en-tête Host : on autorise explicitement l'adresse du codespace
  # pour les formulaires (Server Actions). Voir ALLOWED_ORIGINS dans next.config.ts.
  if [ -n "${CODESPACE_NAME:-}" ]; then
    export ALLOWED_ORIGINS="${CODESPACE_NAME}-${PORT}.${DOMAIN}"
  else
    export ALLOWED_ORIGINS="*.${DOMAIN}"
  fi
}

update() {
  # Récupère la dernière version publiée, seulement si rien n'a été modifié à la main dans le codespace.
  if git diff --quiet && git diff --cached --quiet; then
    git pull --ff-only --quiet || log "Mise à jour impossible pour l'instant : la version actuelle est conservée."
  fi
}

install_deps() {
  local hash
  hash=$(sha256sum package-lock.json | cut -d' ' -f1)
  if [ ! -d node_modules ] || [ "$(cat node_modules/.palette-lock 2>/dev/null)" != "$hash" ]; then
    log "Installation des dépendances (quelques minutes la première fois)…"
    npm ci --no-audit --no-fund
    echo "$hash" > node_modules/.palette-lock
  fi
}

migrate() {
  log "Préparation de la base de données…"
  local attempt
  for attempt in $(seq 1 20); do
    if node_modules/.bin/prisma migrate deploy; then return 0; fi
    log "Base pas encore prête (tentative $attempt/20), nouvel essai dans 3 s…"
    sleep 3
  done
  log "La base PostgreSQL ne répond pas. Rechargez la page du codespace pour réessayer."
  exit 1
}

seed_demo() {
  # N'ajoute les comptes et éléments de démonstration que si la base ne contient aucun compte.
  node_modules/.bin/tsx prisma/demo-on-empty.ts
}

build() {
  local head
  head=$(git rev-parse HEAD 2>/dev/null || echo inconnu)
  if [ ! -f .next/BUILD_ID ] || [ "$(cat .next/.palette-commit 2>/dev/null)" != "$head" ]; then
    log "Compilation de l'application (1 à 3 minutes)…"
    npm run build
    echo "$head" > .next/.palette-commit
  fi
}

running() {
  curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1
}

main() {
  case "${1:-}" in
    prepare)
      load_env
      install_deps
      migrate
      seed_demo
      build
      log "Installation terminée."
      ;;
    start)
      load_env
      if running; then
        log "Palette tourne déjà : onglet « Ports », ligne Palette, icône globe."
        return 0
      fi
      update
      install_deps
      migrate
      seed_demo
      build
      log "Palette démarre. Adresse : https://${CODESPACE_NAME:-<nom-du-codespace>}-${PORT}.${DOMAIN}"
      log "Connexion TGE : admin@thegoodexperience.com / ${SEED_ADMIN_PASSWORD:-Palette2026}"
      log "Laissez ce terminal ouvert : le fermer arrête l'application."
      exec node_modules/.bin/next start -p "$PORT"
      ;;
    *)
      echo "Usage : $0 prepare|start" >&2
      exit 2
      ;;
  esac
}

# Tout le script est lu avant exécution : une mise à jour de ce fichier par « git pull » ne perturbe pas la session en cours.
main "$@"
exit $?
