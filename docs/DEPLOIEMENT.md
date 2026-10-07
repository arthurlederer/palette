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

Le `Dockerfile` fourni construit une image autonome qui applique les migrations au démarrage.

1. Créer un projet Railway depuis le dépôt GitHub (Railway détecte le Dockerfile).
2. Ajouter un service **PostgreSQL** ; référencer son URL dans `DATABASE_URL`.
3. Photos : soit un **volume** monté sur `/app/storage` avec `STORAGE_DRIVER=local` et `LOCAL_STORAGE_DIR=/app/storage`, soit un bucket S3.
4. Renseigner `SESSION_SECRET`, configurer la sonde de santé sur `/api/health`.

## Premier super user

Sur une base vide, créer le premier compte TGE avec le script fourni (les suivants se créent depuis l'application, menu *Équipe TGE*) :

```bash
DATABASE_URL="<url de production>" npx tsx scripts/create-admin.ts "Prénom Nom" prenom.nom@thegoodexperience.com
# le mot de passe est demandé de façon interactive
```

Ne lancez **jamais** `npm run db:seed` en production : il efface les données.

## Vérifications après déploiement

- `GET /api/health` répond `{"status":"ok"}`.
- Connexion avec le super user, création d'un menuisier et d'un compte menuisier.
- Sur un téléphone : connexion du menuisier, déclaration avec photo, puis vérification côté TGE.

## Sauvegardes

- Base : activer les sauvegardes automatiques de l'hébergeur (Supabase et Railway les proposent).
- Photos : activer le versioning du bucket S3 si disponible.
