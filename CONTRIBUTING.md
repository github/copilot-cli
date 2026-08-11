# Guide de contribution — Evodron

Merci de contribuer à Evodron ! Voici les règles à suivre.

## Pré-requis

- Node.js >= 18
- npm >= 9

## Installation locale

```bash
git clone https://github.com/julesdemangeot-ship-it/EVODRON.git
cd EVODRON
npm install
cp .env.example .env
# Éditer .env et définir JWT_SECRET
```

## Lancer les tests

```bash
npm test
```

Les tests utilisent une base SQLite en mémoire. Aucune configuration externe requise.

## Conventions

- **Code** : `'use strict'` en tête de chaque fichier JS.
- **Commits** : messages en anglais, préfixés (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **Branches** : `feature/<nom>`, `fix/<nom>`, `chore/<nom>`.
- **Tests** : toute nouvelle fonctionnalité doit être accompagnée de tests dans `tests/`.

## Structure du code EVODRON

Voir `EVODRON.md` pour la description complète de l'architecture.

## Pull Requests

1. Créer une branche depuis `main`.
2. Écrire ou adapter les tests.
3. S'assurer que `npm test` passe à 100%.
4. Ouvrir une PR avec une description claire.

## Sécurité

Voir `SECURITY.md` pour signaler une vulnérabilité.
