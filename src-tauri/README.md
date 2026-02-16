# Tauri — N'FA KA SÉRUM (frontend Nuxt)

Cette app desktop charge l’interface **Nuxt** de ce projet (nouveau design : login, dashboard, etc.).

## Première utilisation

1. **Icônes** : copier le dossier `credit-flow-reference/src-tauri/icons` vers `src-tauri/icons` (32x32.png, 128x128.png, icon.ico, icon.icns, etc.).
2. À la **racine du projet** (nuxt-shadcn-dashboard-main) :
   - `pnpm install`
   - `pnpm run tauri:dev` (lance Nuxt puis ouvre la fenêtre Tauri)
   - ou `pnpm run tauri:build` pour construire l’app desktop.

## Prérequis

- [Rust](https://rustup.rs/)
- [Tauri v2](https://tauri.app/v2/guides/getting-started/setup/)
