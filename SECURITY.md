# Politique de sécurité — Evodron

## Signaler une vulnérabilité

Si vous découvrez une vulnérabilité de sécurité dans Evodron, **ne l'ouvrez pas publiquement** en tant qu'issue GitHub.

Contactez directement le mainteneur via la fonctionnalité **"Report a vulnerability"** de GitHub (onglet "Security" du dépôt) ou par email privé.

Nous nous engageons à :
- Accuser réception sous 48 heures.
- Fournir un correctif ou un plan d'action sous 7 jours pour les vulnérabilités critiques.
- Créditer le rapporteur dans le changelog si souhaité.

## Versions supportées

| Version | Support sécurité |
|---------|-----------------|
| 1.x     | ✅ Oui           |

## Bonnes pratiques intégrées

- Mots de passe hachés avec **bcrypt** (coût 12)
- Tokens JWT signés HS256 avec expiration
- Rate limiting sur toutes les routes d'authentification
- Protection anti-auto-parrainage (modèle + contrainte DB)
- Variables sensibles jamais commitées (`.env` dans `.gitignore`)
