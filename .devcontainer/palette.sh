#!/usr/bin/env bash
# Palette dans GitHub Codespaces (instance de test, données de démonstration).
#   palette.sh prepare : à la création du codespace (dépendances, base, données de démo, compilation)
#   palette.sh start   : à chaque ouverture (mise à jour si possible, puis lancement sur le port 3000)
# Chaque étape est idempotente : relancer le script ne refait que ce qui manque.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3000
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
# Nom du codespace : variable d'environnement, ou fichier partagé écrit par Codespaces (conteneurs docker-compose).
CS_NAME="${CODESPACE_NAME:-$(sed -n 's/^CODESPACE_NAME=//p' /workspaces/.codespaces/shared/.env 2>/dev/null | tr -d '"' || true)}"
export GIT_TERMINAL_PROMPT=0

log() { printf '\n\033[1;35m[Palette]\033[0m %s\n' "$*"; }

app_url() {
  if [ -n "$CS_NAME" ]; then
    echo "https://${CS_NAME}-${PORT}.${DOMAIN}"
  else
    echo "onglet PORTS, ligne Palette (3000), colonne Forwarded Address"
  fi
}

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
  # Le relais de ports de Codespaces remplace l'en-tête Origin du navigateur par http://localhost:3000
  # et transmet l'adresse publique dans X-Forwarded-Host : on autorise ces deux formes, sans joker
  # (un joker *.app.github.dev laisserait n'importe quel autre codespace envoyer nos formulaires).
  ALLOWED_ORIGINS="localhost:${PORT},127.0.0.1:${PORT}"
  if [ -n "$CS_NAME" ]; then ALLOWED_ORIGINS="${ALLOWED_ORIGINS},${CS_NAME}-${PORT}.${DOMAIN}"; fi
  export ALLOWED_ORIGINS
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
    npm ci --no-audit --no-fund || return 1
    echo "$hash" > node_modules/.palette-lock
  fi
}

migrate() {
  log "Préparation de la base de données…"
  local attempt output
  for attempt in $(seq 1 20); do
    if output=$(node_modules/.bin/prisma migrate deploy 2>&1); then
      echo "$output" | tail -n 1
      return 0
    fi
    # On ne réessaie que si la base n'est pas encore joignable (P1001) ; toute autre erreur est affichée telle quelle.
    if ! grep -q "P1001" <<<"$output"; then
      echo "$output" >&2
      log "La mise à jour de la base a échoué (message ci-dessus)."
      return 1
    fi
    log "Base pas encore prête (tentative $attempt/20), nouvel essai dans 3 s…"
    sleep 3
  done
  log "La base PostgreSQL ne répond pas. Rechargez la page du codespace pour réessayer."
  return 1
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
    npm run build || return 1
    echo "$head" > .next/.palette-commit
  fi
}

running() {
  curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1
}

prepare() {
  install_deps && migrate && seed_demo && build
}

start() {
  local before
  before=$(git rev-parse HEAD 2>/dev/null || echo inconnu)
  update
  if ! prepare; then
    if [ "$(git rev-parse HEAD 2>/dev/null || echo inconnu)" = "$before" ]; then return 1; fi
    # La nouvelle version ne s'installe pas : on revient à celle qui fonctionnait (l'arbre était propre avant la mise à jour).
    log "La nouvelle version ne démarre pas : retour à la version précédente."
    git reset --hard --quiet "$before"
    prepare || return 1
  fi
  log "Palette démarre. Adresse : $(app_url)"
  log "Connexion TGE : admin@thegoodexperience.com / ${SEED_ADMIN_PASSWORD:-Palette2026}"
  log "Laissez ce terminal ouvert : le fermer arrête l'application."
  # Une ligne par page consultée : l'activité sur Palette (téléphone compris) retarde la mise en veille du codespace.
  export PALETTE_LOG_REQUESTS=1
  # L'app n'a pas besoin du jeton GitHub du codespace : on ne le lui transmet pas.
  exec env -u GITHUB_TOKEN -u GH_TOKEN node_modules/.bin/next start -p "$PORT"
}

main() {
  # Un seul lancement à la fois (rechargement de la page pendant une installation, plusieurs onglets…).
  # Le verrou reste détenu par le serveur, qui hérite du descripteur 9.
  exec 9>/tmp/palette.lock
  case "${1:-}" in
    prepare)
      flock 9
      load_env
      if prepare; then
        log "Installation terminée."
      else
        log "Installation incomplète : elle reprendra au lancement de Palette."
        return 1
      fi
      ;;
    start)
      if ! flock -n 9 || running; then
        log "Palette est déjà lancée (ou en cours de lancement) dans un autre terminal."
        log "Adresse : $(app_url)"
        return 0
      fi
      load_env
      if ! start; then
        log "Palette n'a pas pu démarrer (message ci-dessus). Pour réessayer : rechargez la page du codespace."
        return 1
      fi
      ;;
    *)
      echo "Usage : $0 prepare|start" >&2
      return 2
      ;;
  esac
}

# Tout le script est lu avant exécution : une mise à jour de ce fichier par « git pull » ne perturbe pas la session en cours.
main "$@"
exit $?
