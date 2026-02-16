# Credit Flow — Version Nuxt (N'FA KA SÉRUM)

Ce projet est la **mise à jour** de [Credit Flow](https://github.com/hassan312-god/credit-flow) en utilisant le **même admin panel** (design, sidebar, thème) que le template Nuxt Shadcn Dashboard, avec le **même backend Supabase** que l’application React d’origine.

## Ce qui a été fait

- **Supabase** : client configuré (`app/lib/supabase.ts`, plugin, composable `useSupabase()`), types dans `app/types/database.ts`.
- **Menu** : remplacé par celui de Credit Flow (Tableau de bord, Clients, Prêts, Paiements, Recouvrement, Rapports, Utilisateurs, Paramètres, Auth, etc.).
- **Tableau de bord** : page `/dashboard` avec statistiques Supabase (nombre de clients, prêts, en attente, en retard, montant total, prêts récents).
- **Pages** : créées en placeholder pour Clients, Prêts, Paiements, Recouvrement, Rapports, Utilisateurs, Fonds société, Horaires, Présence, Rapports présence, Journaux d’activité, Sync, Auth (login, register, forgot-password).
- **Accueil** : `/` redirige vers `/dashboard`.
- **Titre** : "Credit Flow (N'FA KA SÉRUM) — Gestion de crédit".

## Démarrage

1. Copier `.env.example` vers `.env` et renseigner :
   - `NUXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase (identique à l’app React).
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY` : clé anon Supabase.

2. Lancer le serveur :
   ```bash
   pnpm run dev
   ```
   Puis ouvrir http://localhost:3000 (vous serez redirigé vers `/dashboard`).

3. Si Supabase n’est pas configuré, le tableau de bord affichera un message d’erreur et les stats resteront à 0. Dès que `.env` est correct, les données de votre base Credit Flow s’affichent.

## À faire côté fonctionnel

- **Clients** : liste, création, édition, détail (comme dans l’app React).
- **Prêts** : liste, formulaire de création, détail, validation.
- **Paiements** : enregistrement, historique, lien avec les échéances.
- **Recouvrement** : liste des prêts en retard/défaut, alertes.
- **Rapports** : financiers, export PDF/Excel (réutiliser la logique React en Vue).
- **Utilisateurs** : gestion des rôles (Admin, Directeur, Agent, Caissier, Recouvrement) avec `profiles` + `user_roles`.
- **Auth** : connexion / inscription / mot de passe oublié avec Supabase Auth (même config que l’app React).
- **Fonds société, Horaires, Présence, Activity logs, Sync** : brancher les vues sur les tables Supabase existantes.

Les **migrations Supabase** et la **structure des tables** restent celles du dépôt [credit-flow](https://github.com/hassan312-god/credit-flow) (dossier `supabase/migrations/`). Aucun changement de schéma n’est nécessaire pour cette version Nuxt.

## Stack

- **Nuxt 4**, **Vue 3**, **Shadcn Vue**, **Tailwind CSS 4**
- **Supabase** (client JS, même projet que l’app React)
- **Pinia** (si besoin d’état global)
- **TypeScript**

## Référence

- Dépôt Credit Flow (React) : https://github.com/hassan312-god/credit-flow  
- Démo en ligne : https://credit-flow-eight.vercel.app  
