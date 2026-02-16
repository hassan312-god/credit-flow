# App Tauri (N'FA KA SÉRUM) — frontend Nuxt

L’application desktop Tauri utilise **ce projet Nuxt** comme interface (nouveau design : login, mot de passe oublié, dashboard, etc.).

## Configuration

- **En dev** : Tauri ouvre une fenêtre sur `http://localhost:3000` (serveur Nuxt).
- **En build** : `pnpm run generate` produit le site statique dans `.output/public`, puis Tauri embarque ce dossier.

## Prérequis

- Rust et Cargo installés
- [Tauri CLI](https://tauri.app/v2/guides/getting-started/setup/) (v2)
- Icônes : copier le dossier `credit-flow-reference/src-tauri/icons` vers `src-tauri/icons` si besoin.

## Commandes (à la racine du projet Nuxt)

```bash
# Développement : lance le serveur Nuxt puis ouvre la fenêtre Tauri
pnpm run tauri:dev

# Build de l’app desktop (génère d’abord le site Nuxt)
pnpm run tauri:build
```

La première fois, installer les dépendances Tauri : `cd src-tauri && cargo build` (ou laisser `pnpm run tauri:dev` le faire).

## Design principal

Le design principal de l’app (carte blanche sur fond vert, login / mot de passe oublié, dashboard) est celui de ce projet Nuxt. Il est utilisé à la fois en web et dans l’app Tauri.
