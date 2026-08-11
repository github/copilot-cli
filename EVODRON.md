# Evodron

**Plateforme de parrainage** — backend Node.js/Express, base SQLite, frontend statique.

> ℹ️ Le fichier `README.md` à la racine documente le **GitHub Copilot CLI** (outil de développement intégré à ce dépôt). Ce fichier `EVODRON.md` documente le **produit EVODRON** lui-même.

---

## Architecture

```
evodron/
├── app.js                  # Point d'entrée Express
├── public/                 # Frontend statique (HTML/CSS/JS)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── referral.html
│   ├── css/style.css
│   └── js/referral.js
├── src/
│   ├── config/
│   │   └── rewards.js      # Configuration des récompenses
│   ├── db/
│   │   ├── database.js     # Connexion SQLite (better-sqlite3)
│   │   └── schema.sql      # Schéma de la base de données
│   ├── middleware/
│   │   ├── auth.js         # Vérification JWT
│   │   └── rateLimiter.js  # Rate limiting par IP
│   ├── models/
│   │   ├── user.js         # Modèle utilisateur
│   │   ├── referral.js     # Modèle parrainage
│   │   └── reward.js       # Modèle récompenses
│   └── routes/
│       ├── auth.js         # /api/auth (register, login)
│       ├── health.js       # /api/health
│       └── referral.js     # /api/referral (link, stats, rewards, activate-use)
└── tests/
    ├── referral.test.js    # Tests flux de parrainage
    ├── anti-abuse.test.js  # Tests anti-fraude
    └── health.test.js      # Tests endpoint /api/health
```

## Prérequis

- **Node.js** >= 18
- **npm** >= 9

## Installation

```bash
git clone https://github.com/julesdemangeot-ship-it/EVODRON.git
cd EVODRON
npm install
cp .env.example .env
# Éditer .env et définir JWT_SECRET
```

## Démarrage

```bash
JWT_SECRET=votre-clé-secrète npm start
# ou avec le fichier .env :
npm start
```

Le serveur écoute sur `http://localhost:3000` (configurable via `PORT`).

## Tests

```bash
npm test
```

Tous les tests utilisent une base SQLite en mémoire (`DB_PATH=:memory:`). Aucune configuration supplémentaire n'est requise.

## API

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/register` | Créer un compte (avec code de parrainage optionnel) |
| `POST` | `/api/auth/login` | Se connecter, obtenir un token JWT |

### Parrainage

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/referral/link` | ✅ | Obtenir son lien de parrainage |
| `GET` | `/api/referral/stats` | ✅ | Statistiques de parrainage |
| `GET` | `/api/referral/rewards` | ✅ | Historique et récompenses disponibles |
| `POST` | `/api/referral/claim-reward/:id` | ✅ | Réclamer une récompense |
| `POST` | `/api/referral/activate-use` | ✅ | Déclarer la première utilisation active |
| `GET` | `/api/referral/program-info` | ❌ | Conditions du programme (public) |

### Santé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/health` | État de l'application et de la base de données |

### Authentification JWT

Passer le token JWT via le header HTTP `Authorization` (schéma `Bearer`) ou dans un cookie nommé `token`.

## Variables d'environnement

Voir `.env.example` pour la liste complète.

| Variable | Obligatoire | Défaut | Description |
|----------|-------------|--------|-------------|
| `JWT_SECRET` | ✅ | — | Clé secrète JWT |
| `JWT_EXPIRY` | ❌ | `7d` | Durée de validité du token |
| `PORT` | ❌ | `3000` | Port d'écoute |
| `APP_URL` | ❌ | détecté | URL de base pour les liens de parrainage |
| `DB_PATH` | ❌ | `./evodron.db` | Chemin du fichier SQLite |
| `NODE_ENV` | ❌ | `development` | Environnement d'exécution |

## Déploiement Docker

```bash
# Copier et éditer les variables
cp .env.example .env
# Démarrer
docker compose up -d
```

## Flux de parrainage

```
Alice s'inscrit → obtient un code de parrainage unique
  ↓
Alice partage son lien : /register?ref=ABCD1234
  ↓
Bob s'inscrit avec ce lien → reçoit un bonus de bienvenue (10 crédits)
  ↓
Bob effectue sa première action active → POST /api/referral/activate-use
  ↓
Alice reçoit sa récompense de parrain (20 crédits)
```

## Sécurité

- Mots de passe hachés avec **bcrypt** (coût 12)
- Tokens JWT signés (HS256)
- Rate limiting : 10 req/15 min sur `/api/auth`, 100 req/min sur `/api/referral`
- Auto-parrainage interdit (vérification modèle + contrainte DB)
- Un utilisateur ne peut avoir qu'un seul parrain (contrainte UNIQUE en base)
- Pas de récompense sans activation effective du filleul

## Licence

Le code source EVODRON (dossiers `src/`, `public/`, `tests/`, fichiers `app.js`, `package.json`) est propriétaire.

Le fichier `README.md`, `install.sh`, `changelog.md` et `LICENSE.md` sont des fichiers hérités du **GitHub Copilot CLI** distribués sous leur propre licence (voir `LICENSE.md`).
