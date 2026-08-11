# Evodron

**Plateforme EVODRON** — API TypeScript/Fastify, CLI EVODRON, base SQLite et architecture modulaire.

> ℹ️ Le fichier `README.md` à la racine documente le **GitHub Copilot CLI** hérité du dépôt. Le produit EVODRON réellement exécutable vit désormais dans le dossier `/evodron` et est piloté depuis la racine via les scripts npm de ce dépôt.

---

## Architecture

```
/
├── package.json            # Scripts racine (setup / build / test / start)
├── Dockerfile              # Image API EVODRON
├── docker-compose.yml      # Déploiement local/simple
└── evodron/
    ├── package.json        # Workspace npm
    ├── docs/               # Documentation produit / architecture
    ├── scripts/setup.sh    # Setup développeur
    └── packages/
        ├── api/            # API Fastify + auth + referrals + rewards
        ├── cli/            # CLI EVODRON
        ├── db/             # Schéma, migrations, seed
        └── shared/         # Types et schémas partagés
```

## Prérequis

- **Node.js** >= 18
- **npm** >= 9

## Installation

```bash
cd /home/runner/work/EVODRON/EVODRON
cp .env.example .env
# Éditer .env et définir EVODRON_JWT_SECRET
npm run setup
```

## Démarrage

```bash
npm start
```

Le serveur écoute sur `http://localhost:3000` (configurable via `EVODRON_API_PORT`).

## Tests

```bash
npm test
```

La suite lance les tests workspace EVODRON (`evodron/packages/*`).

## API

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/auth/register` | Créer un compte (avec code de parrainage optionnel) |
| `POST` | `/auth/login` | Se connecter, obtenir access token + refresh token |
| `POST` | `/auth/refresh` | Renouveler la session |
| `POST` | `/auth/logout` | Révoquer un refresh token |

### Parrainage

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/users/me` | ✅ | Profil courant |
| `GET` | `/referrals/code` | ✅ | Obtenir son code et lien |
| `GET` | `/referrals/stats` | ✅ | Statistiques de parrainage |
| `POST` | `/sessions/start` | ✅ | Démarrer une session CLI |
| `POST` | `/sessions/end` | ✅ | Terminer une session CLI |
| `GET` | `/rewards` | ✅ | Historique des crédits |
| `GET` | `/rewards/rules` | ✅ | Règles actives |
| `GET` | `/stats` | ✅ | Statistiques d’utilisation |

### Santé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | État de l'application et de la base de données |

### Authentification JWT

Passer l’access token JWT via le header HTTP `Authorization: ******

## Variables d'environnement

Voir `.env.example` pour la liste complète.

| Variable | Obligatoire | Défaut | Description |
|----------|-------------|--------|-------------|
| `EVODRON_JWT_SECRET` | ✅ | — | Clé secrète JWT |
| `EVODRON_API_PORT` | ❌ | `3000` | Port d'écoute |
| `EVODRON_API_HOST` | ❌ | `0.0.0.0` | Host d'écoute |
| `EVODRON_API_URL` | ❌ | `http://localhost:3000` | URL de l’API pour le CLI |
| `EVODRON_REFERRAL_BASE_URL` | ❌ | `https://evodron.io` | URL de base des liens de parrainage |
| `EVODRON_DB_URL` | ❌ | `file:./evodron.db` | Chemin/URL de base SQLite |
| `EVODRON_REWARD_MIN_SESSIONS` | ❌ | `3` | Seuil avant validation d’un parrainage |
| `EVODRON_BODY_LIMIT_BYTES` | ❌ | `1048576` | Taille max des payloads JSON |
| `NODE_ENV` | ❌ | `development` | Environnement d'exécution |
| `LOG_LEVEL` | ❌ | `info` | Niveau de logs |

## Déploiement Docker

```bash
# Copier et éditer les variables
cp .env.example .env
# Démarrer
docker compose up -d
```

## Flux de parrainage

```
Alice crée son compte → obtient un code de parrainage unique
  ↓
Alice partage son lien : /ref/ABCD1234
  ↓
Bob s'inscrit avec ce code → reçoit un bonus de bienvenue (50 crédits)
  ↓
Bob complète le nombre minimum de sessions configuré
  ↓
Alice reçoit sa récompense de parrain (100 crédits par défaut)
```

## Sécurité

- Mots de passe hachés avec **bcrypt** (coût 12)
- Access tokens courts + refresh tokens révoquables
- Rate limiting global et spécifique auth
- Auto-parrainage interdit
- Un utilisateur ne peut avoir qu'un seul parrain
- IP hachées pour l’anti-abus
- Pas de récompense sans usage vérifié

## Licence

Le code source EVODRON exécutable se trouve dans `evodron/` et est propriétaire.

Le fichier `README.md`, `install.sh`, `changelog.md` et `LICENSE.md` sont des fichiers hérités du **GitHub Copilot CLI** distribués sous leur propre licence (voir `LICENSE.md`).
