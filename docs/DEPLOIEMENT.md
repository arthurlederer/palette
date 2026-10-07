# Déploiement

Palette a besoin de trois choses en production : **l'application** (Node.js), **une base PostgreSQL** et **un stockage pour les photos**. Toute la configuration passe par les variables d'environnement décrites dans `.env.example`.

## Variables obligatoires

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL PostgreSQL de production (avec `?sslmode=require` si l'hébergeur l'exige) |
| `SESSION_SECRET` | Chaîne aléatoire de 32 caractères minimum : `openssl rand -base64 48` |
| `STORAGE_DRIVER` | `s3` (recommandé) ou `local` avec un volume persistant |
| `S3_*` | Si `s3` : bucket **privé**, clés d'accès, endpoint et région |

## Option recommandée : Vercel + Supabase (région Europe)

1. **Supabase** : créer un projet (région Paris ou Francfort).
   - *Database* : copier l'URL de connexion « Session pooler » → `DATABASE_URL`.
   - *Storage* : créer un bucket **privé** `palette-photos`, puis *Settings → S3 access keys* : créer une clé → `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` ; l'endpoint S3 et la région sont affichés sur la même page → `S3_ENDPOINT`, `S3_REGION`. `S3_BUCKET=palette-photos`, `STORAGE_DRIVER=s3`.
2. **Vercel** : importer le dépôt GitHub, renseigner les variables ci-dessus, déployer.
   - Commande de build : `npm run build` (par défaut).
   - Appliquer les migrations : `npm run db:deploy` en local avec la `DATABASE_URL` de production, ou ajouter `prisma migrate deploy &&` en tête de la commande de build.
3. Créer le premier super user (voir plus bas).

Chaque modification poussée sur la branche principale est redéployée automatiquement.

## Option tout-en-un : Railway (ou Render, Fly.io, Scaleway…)

Le `Dockerfile` fourni construit une image autonome qui, à chaque démarrage, applique les migrations puis lance le serveur. `railway.json` configure la sonde de santé (`/api/health`).

1. Sur [railway.com](https://railway.com), se connecter avec GitHub, puis *New Project → Deploy from GitHub repo* et choisir le dépôt (et la branche).
2. Dans le projet : *+ Create → Database → PostgreSQL*.
3. Dans le service de l'app, onglet *Variables* :
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (référence proposée par Railway) ;
   - `SESSION_SECRET` = une longue chaîne aléatoire (`openssl rand -base64 48`) ;
   - pour une **instance de test** uniquement : `SEED_DEMO=true` charge les comptes et éléments de démonstration au premier démarrage, si la base est vide.
4. Photos : clic droit sur le service → *Attach volume*, point de montage `/app/storage` (le stockage local par défaut écrit dans ce dossier). Sans volume, les photos seraient perdues à chaque redéploiement. Alternative : un bucket S3 (`STORAGE_DRIVER=s3`).
5. Onglet *Settings → Networking → Generate Domain* : Railway fournit l'adresse publique en HTTPS.

## Instance de test sans hébergeur : GitHub Codespaces

Pour une démonstration, sans base ni hébergeur à configurer : bouton *Ouvrir dans GitHub Codespaces* du README (lien `https://codespaces.new/arthurlederer/palette?quickstart=1`).
Le dossier `.devcontainer/` décrit l'environnement : un conteneur Node 22 et un PostgreSQL 16, puis `.devcontainer/palette.sh` installe, migre, charge les données de démonstration, compile et lance l'app sur le port 3000. À chaque ouverture, le script récupère la dernière version de la branche et ne refait que les étapes nécessaires.

Le relais de ports de Codespaces réécrit l'en-tête `Host` ; le script renseigne donc `ALLOWED_ORIGINS` avec l'adresse du codespace, sans quoi Next.js refuserait les formulaires. Cette instance n'est pas faite pour la production : elle se met en veille après 30 minutes d'inactivité et ses mots de passe sont ceux, publics, de la démo.

## Premier super user

Sur une base vide, créer le premier compte TGE avec le script fourni (les suivants se créent depuis l'application, menu *Équipe TGE*) :

```bash
DATABASE_URL="<url de production>" npx tsx scripts/create-admin.ts "Prénom Nom" prenom.nom@thegoodexperience.com
# le mot de passe est demandé de façon interactive
```

Ne lancez **jamais** `npm run db:seed` en production : il efface les données. `SEED_DEMO=true`, lui, n'agit que sur une base sans aucun compte, mais n'a pas sa place sur l'instance réelle : retirez-le une fois les tests terminés.

## En cas d'échec au démarrage

Les logs de démarrage (*Deploy Logs* sur Railway) commencent par les lignes `[Palette]` :
- `Démarrage impossible, configuration à corriger` liste les variables manquantes ou invalides ;
- `Base injoignable (tentative n/10)` : l'app réessaie pendant 30 secondes, puis abandonne si la base reste injoignable (DATABASE_URL incorrecte, base arrêtée) ;
- `Démarrage du serveur sur le port …` : l'app est lancée ; si le site ne répond pas, vérifier que le port du domaine public correspond.

## Vérifications après déploiement

- `GET /api/health` répond `{"status":"ok"}`.
- Connexion avec le super user, création d'un menuisier et d'un compte menuisier.
- Sur un téléphone : connexion du menuisier, déclaration avec photo, puis vérification côté TGE.

## Sauvegardes

- Base : activer les sauvegardes automatiques de l'hébergeur (Supabase et Railway les proposent).
- Photos : activer le versioning du bucket S3 si disponible.
