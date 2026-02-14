# Credit Flow (N'FA KA SÉRUM)

[![Build Windows](https://github.com/hassan312-god/credit-flow/actions/workflows/build-windows.yml/badge.svg)](https://github.com/hassan312-god/credit-flow/actions/workflows/build-windows.yml)

**📥 [Télécharger](https://github.com/hassan312-god/credit-flow/releases/latest)** (Windows / macOS / Linux) — Page : [credit-flow-eight.vercel.app/download.html](https://credit-flow-eight.vercel.app/download.html)

Application de gestion de crédit et de prêts (clients, prêts, paiements, recouvrement), avec mode hors ligne (PWA), app desktop Tauri et synchronisation Supabase.

---

## Fonctionnalités

- **Tableau de bord** : statistiques, prêts en attente/retard, graphiques
- **Clients** : profils, historique prêts/paiements, recherche
- **Prêts** : création, validation, statuts, échéances
- **Paiements** : enregistrement, partiels, retard, historique
- **Recouvrement** : prêts en défaut, alertes
- **Rapports** : financiers, export PDF/Excel, présence
- **Utilisateurs** : rôles (Admin, Directeur, Agent, Caissier, Recouvrement)
- **Hors ligne** : IndexedDB, Service Worker, sync automatique au retour connexion

## Stack

React 18, TypeScript, Vite, shadcn/ui, Tailwind, Supabase, Tauri 2, PWA.

---

## Prérequis

- Node.js 18+, npm ou bun
- Supabase (projet + migrations dans `supabase/migrations/`)
- Pour le desktop : [Rust](https://rustup.rs/) ; Windows : Microsoft C++ Build Tools ; macOS : Xcode CLI ; Linux : webkit2gtk, build-essential, etc.

## Installation

```bash
git clone https://github.com/hassan312-god/credit-flow.git
cd credit-flow
npm install
```

Créer un `.env` à la racine :

```env
VITE_SUPABASE_URL=votre_url
VITE_SUPABASE_ANON_KEY=votre_clé
```

Lancer :

```bash
npm run dev
```

→ `http://localhost:8080`

## Application desktop (Tauri)

```bash
npm run tauri:dev          # Développement
npm run tauri:build       # Build plateforme actuelle
npm run tauri:build:windows
npm run tauri:build:macos
npm run tauri:build:linux
```

Sortie : `src-tauri/target/<target>/release/bundle/` (`.msi`, `.exe`, `.dmg`, `.deb`, `.AppImage`).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build web production |
| `npm run tauri:dev` | App desktop (dev) |
| `npm run tauri:build` | Build desktop |
| `npm run lint` | ESLint |

## Structure

```
credit-flow/
├── src/              # React (components, pages, hooks, services)
├── src-tauri/        # Tauri (Rust, tauri.conf.json, icons/)
├── supabase/         # Migrations SQL
├── public/           # Statique (dont download.html)
└── .github/workflows # CI (build Windows, macOS, Linux, release)
```

## Déploiement

- **Web** : `npm run build` → déployer `dist/` (Vercel/Netlify).
- **Desktop** : utiliser GitHub Actions (voir ci‑dessous).

## GitHub Actions (builds automatiques)

- **Workflows** : `build-windows.yml`, `build-macos.yml`, `build-linux.yml`, `build-all.yml`, `release.yml`.
- **Déclenchement** : push sur `main`, tag `v*`, ou exécution manuelle (Actions → Run workflow).
- **Artefacts** : Actions → run → télécharger le zip (`.msi`, `.exe`, `.dmg`, etc.).

**Secrets (optionnel, pour signer les installateurs)** : Settings → Secrets and variables → Actions → ajouter `TAURI_SIGNING_PRIVATE_KEY` (contenu du fichier `.key`) et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (mot de passe de la clé).

**Créer une release** : `git tag v1.0.0 && git push origin v1.0.0`

## Mises à jour automatiques (desktop)

1. `npm run tauri signer generate -w ~/.tauri/myapp.key`
2. Mettre la clé publique dans `tauri.conf.json` (plugins.updater.pubkey).
3. Ajouter les secrets GitHub ci‑dessus.

## Dépannage

- **Erreur « Signature PNG invalide » / crash sur les icônes** : régénérer les icônes avec `npm run tauri icon path/to/icon.png`, puis committer `src-tauri/icons/` (32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns).
- **Échec signature en CI** : vérifier que `TAURI_SIGNING_PRIVATE_KEY` et `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` existent dans les secrets du dépôt.

## Sécurité

Authentification Supabase, RLS sur les tables, contrôle d’accès par rôles, validation côté client/serveur.

## Licence

MIT.

## Auteur

**Hassan** — [@hassan312-god](https://github.com/hassan312-god)

**Support** : [Ouvrir une issue](https://github.com/hassan312-god/credit-flow/issues)
