# Décisions d'architecture

Ce document explique les choix techniques de Palette et ce qui les motive. Chaque décision est courte : contexte, choix, raisons, conséquences.

## Vue d'ensemble

```
 Téléphone menuisier ─┐                      ┌─> PostgreSQL (éléments, clients, menuisiers, comptes, historique)
                      ├─> Next.js (une app) ─┤
 Poste équipe TGE ────┘   pages + actions    └─> Stockage photos (disque local ou S3 privé)
                          serveur + API
```

Une seule application web, responsive, sert les deux publics. Le navigateur compresse les photos avant l'envoi ; le serveur valide, contrôle les droits, normalise la photo, enregistre et sert les photos après contrôle d'accès.

---

## ADR 1 · Une application web responsive (PWA) plutôt qu'une app native

**Contexte.** Le livrable est une « app mobile » pour les menuisiers, mais les équipes TGE ont aussi besoin d'un usage desktop. Cinq menuisiers, quelques comptes chacun.

**Choix.** Une application web unique, mobile-first, installable sur l'écran d'accueil (manifest PWA).

**Raisons.**
- Aucun passage par l'App Store / Play Store, pas de compte développeur, pas de validation : une mise à jour est disponible immédiatement pour tous.
- Un seul code pour le mobile menuisier et le desktop TGE.
- L'appareil photo est accessible depuis le navigateur (`<input capture>`), ce qui couvre le besoin de prise de vue.

**Conséquences.** Pas de mode hors ligne complet dans cette version (la déclaration nécessite du réseau). C'est une évolution possible (file d'attente locale + service worker) si les ateliers ont des zones blanches.

## ADR 2 · Next.js (App Router) + TypeScript

**Choix.** Next.js 15, React 19, TypeScript strict, Tailwind CSS 4.

**Raisons.**
- Rendu serveur : les pages arrivent déjà remplies, ce qui compte avec une connexion moyenne (premier chargement ≈ 105 Ko de JavaScript partagé).
- Server Actions : les formulaires appellent directement le serveur, sans API REST à maintenir en double.
- Écosystème très répandu : facile de trouver un développeur pour reprendre le projet.
- TypeScript de bout en bout, schémas de validation partagés entre navigateur et serveur.

## ADR 3 · PostgreSQL + Prisma

**Choix.** PostgreSQL, accès via l'ORM Prisma, migrations versionnées dans `prisma/migrations`.

**Raisons.** Données très relationnelles (élément → client, menuisier, auteur, historique). La recherche par plages de dimensions et mots-clés se fait en SQL indexé. PostgreSQL est proposé en offre gérée par tous les hébergeurs (Supabase, Neon, Railway, Scaleway…). Prisma apporte un typage strict des requêtes et des migrations reproductibles.

**Modèle.**
- `Carpenter` : atelier partenaire (coordonnées affichées aux équipes TGE).
- `User` : compte de connexion, rôle `ADMIN` (super user TGE) ou `CARPENTER` (rattaché à un atelier).
- `Client` : créé automatiquement à la saisie, dédoublonné sans tenir compte de la casse.
- `Element` : dimensions entières en cm (L, H, P), projet, emplacement, notes, clés des photos.
- `ElementHistory` : journal (création, modifications champ par champ, suppression / modération). Conservé après suppression de l'élément.
- `LoginAttempt` : échecs de connexion, pour limiter les tentatives.

## ADR 4 · Les règles d'accès vivent dans une couche métier unique

**Contexte.** Exigence forte : un menuisier ne doit jamais voir les déclarations d'un autre.

**Choix.** Toute lecture ou écriture passe par `src/server/*`, qui reçoit explicitement l'utilisateur (`Viewer`). Le filtre de périmètre (`scopeWhere`) est appliqué à chaque requête sur les éléments, y compris la recherche, l'export, les suggestions de saisie et la lecture des photos.

**Raisons.**
- Un seul endroit à auditer : les pages ne font jamais de requête directe sur les éléments.
- Testable sans navigateur : 10 tests d'intégration ciblent spécifiquement le cloisonnement (lecture, modification, suppression, photo, filtre forcé, mots-clés, export).
- Un élément d'un autre atelier répond « introuvable » (404) plutôt que « interdit », pour ne pas révéler son existence.

**Défense en profondeur.** Le middleware redirige toute requête non authentifiée ; chaque page vérifie le rôle ; chaque service revérifie le rôle et le périmètre.

## ADR 5 · Authentification maison, sobre

**Choix.** Email **ou** téléphone + mot de passe (haché avec bcrypt), session dans un cookie `httpOnly` signé (JWT HS256, 30 jours). L'utilisateur est relu en base à chaque requête.

**Raisons.**
- Le besoin est simple (deux rôles, quelques dizaines de comptes, pas de SSO demandé) : une bibliothèque d'authentification complète ajouterait de la complexité sans bénéfice.
- Relire l'utilisateur à chaque requête permet de **désactiver un compte instantanément**, même si son cookie est encore valide.
- Session longue : un menuisier n'a pas à se reconnecter à chaque passage dans l'atelier.

**Protections.** Blocage de 15 minutes après 5 échecs sur un même identifiant ; message identique que le compte existe ou non ; temps de réponse constant ; redirection après connexion limitée aux chemins internes ; cookies `SameSite=Lax` et `Secure` en production ; en-têtes de sécurité (`X-Frame-Options`, `nosniff`…).

**Évolutions possibles.** Lien magique par email ou code SMS pour les menuisiers, SSO Google / Microsoft pour TGE.

## ADR 6 · Photos : compression dans le navigateur, normalisation serveur, accès contrôlé

**Choix.**
1. Le navigateur réduit la photo (1600 px max, JPEG ≈ 300–800 Ko) avant l'envoi (`browser-image-compression`). Une photo de 3 à 10 Mo devient 10 fois plus légère : l'envoi passe même en 4G moyenne.
2. Le serveur (`sharp`) refuse ce qui n'est pas une image, applique l'orientation, **retire les métadonnées (dont la position GPS)**, convertit en WebP et génère une miniature 480 px pour les listes.
3. Les fichiers ne sont jamais publics : `/api/photos/...` vérifie que l'utilisateur a le droit de voir l'élément avant de servir l'image. Les clés sont uniques et immuables, ce qui permet un cache navigateur long.

**Stockage.** Interface `Storage` avec deux implémentations interchangeables par variable d'environnement : disque local (dev ou serveur avec volume) et S3 compatible (Supabase Storage, Cloudflare R2, Scaleway, AWS). Si l'enregistrement en base échoue, les fichiers déjà envoyés sont supprimés (pas de photo orpheline).

## ADR 7 · Formulaire de déclaration en une seule page

**Choix.** Photo, client, dimensions, projet, emplacement et notes sur un seul écran défilant, avec validation en temps réel (même schéma `zod` que le serveur), autocomplétion des clients, projets et emplacements déjà saisis, champs numériques avec clavier numérique, boutons d'au moins 48 px. En paysage, la photo et les champs se placent côte à côte.

**Raisons.** Cahier des charges (« un seul flow », « boutons larges et tactiles », portrait et paysage) et usage réel : un menuisier en atelier, une main occupée.

## ADR 8 · Recherche par formulaire GET et filtres dans l'URL

**Choix.** Les filtres sont des paramètres d'URL (`/elements?clientId=…&hMin=150&hMax=200`). La recherche fonctionne même avant le chargement du JavaScript ; une recherche se partage par simple copier-coller du lien ; l'export CSV reprend exactement les mêmes filtres.

**Détails.** Plages min/max par dimension (bornes inversées remises dans l'ordre), mots-clés combinés (tous les mots doivent apparaître, dans n'importe quel champ), pagination par 24, tri. Export CSV au format Excel français (séparateur `;`, UTF-8 avec BOM), protégé contre l'injection de formules.

## ADR 9 · Charte graphique

**Choix.** Reprise des codes de thegoodexperience.com : noir et blanc, typographie sans-serif géométrique (Inter, auto-hébergée), espacements généreux, boutons pleins arrondis, un seul accent de couleur pour les actions principales. Le logo TGE est présent sur la page de connexion, dans la barre latérale et l'en-tête mobile. Toutes les couleurs sont des variables CSS dans `src/app/globals.css` : ajuster la charte se fait à un seul endroit.

**À compléter.** Le logo est une version texte en attendant le fichier officiel (voir `src/components/Logo.tsx`), et l'accent orange est une proposition à valider.

## ADR 10 · Tests à trois niveaux

**Choix.** Vitest (unitaires + intégration sur vraie base PostgreSQL) et Playwright (bout en bout sur l'application de production, desktop et mobile).

**Raisons.** Les règles critiques (cloisonnement, recherche, comptes) sont testées au plus près du code, rapidement ; les parcours réels (photo, mobile, export) sont testés dans un vrai navigateur. Un script unique (`npm run test:all`) produit un rapport consolidé, aussi exécuté par la CI GitHub Actions à chaque modification.

## Configuration

Toute la configuration passe par des variables d'environnement validées au démarrage (`src/lib/env.ts`) : une valeur manquante produit un message explicite. Voir `.env.example`.

## Gestion des erreurs

- Erreurs métier (`AppError`) : message clair affiché à l'utilisateur, avec erreurs par champ dans les formulaires.
- Erreurs inattendues : journalisées côté serveur, message générique côté utilisateur, page d'erreur avec bouton « Réessayer ».
- Réseau coupé pendant un envoi : message « Vérifiez votre connexion » sans perdre la saisie.
- Sonde `/api/health` pour la supervision par l'hébergeur.
