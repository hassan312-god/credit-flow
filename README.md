# Credit Flow

Une application web moderne de gestion de crédit et de prêts, conçue pour les institutions financières et les entreprises de microfinance. L'application offre une gestion complète des clients, des prêts, des paiements et du recouvrement, avec un support hors ligne et une synchronisation automatique.

## 🚀 Fonctionnalités Principales

### 📊 Tableau de Bord
- Vue d'ensemble des statistiques clés (clients, prêts, paiements)
- Prêts en attente et en retard
- Notifications de paiements
- Graphiques et visualisations de données

### 👥 Gestion des Clients
- Création et gestion des profils clients
- Informations détaillées (coordonnées, revenus, profession)
- Historique des prêts et paiements par client
- Recherche et filtrage avancés

### 💰 Gestion des Prêts
- Création et validation de prêts
- Suivi des statuts (en attente, approuvé, rejeté, en cours, remboursé, en retard)
- Calcul automatique des échéances
- Planification des remboursements

### 💳 Gestion des Paiements
- Enregistrement des paiements
- Suivi des paiements partiels et en retard
- Notifications automatiques
- Historique complet des transactions

### 🔄 Recouvrement
- Gestion des prêts en défaut
- Suivi des actions de recouvrement
- Alertes pour les prêts en retard

### 📈 Rapports
- Rapports financiers détaillés
- Export de données (PDF, Excel)
- Analyses de performance
- Rapports de présence et temps de travail

### 👤 Gestion des Utilisateurs
- Système de rôles et permissions :
  - **Admin** : Accès complet
  - **Directeur** : Gestion et supervision
  - **Agent de crédit** : Gestion des clients et prêts
  - **Caissier** : Gestion des paiements
  - **Recouvrement** : Gestion du recouvrement
- Contrôle d'accès basé sur les rôles

### ⏰ Présence et Temps de Travail
- Gestion des horaires de travail
- Suivi de la présence des employés
- Rapports de présence
- Sessions de travail

### 💼 Fonds de l'Entreprise
- Suivi des fonds de l'entreprise
- Gestion des entrées et sorties
- Historique des transactions

### 📱 Mode Hors Ligne (PWA)
- Fonctionnement hors ligne complet
- Synchronisation automatique avec Supabase
- Stockage local sécurisé (IndexedDB)
- Queue des actions hors ligne
- Installation en tant qu'application mobile

## 🛠️ Technologies Utilisées

- **Frontend** :
  - React 18.3
  - TypeScript
  - Vite
  - React Router DOM
  - TanStack Query (React Query)

- **UI/UX** :
  - shadcn/ui
  - Tailwind CSS
  - Radix UI
  - Lucide React (icônes)
  - Recharts (graphiques)

- **Backend & Base de données** :
  - Supabase (PostgreSQL)
  - Authentification Supabase

- **Fonctionnalités** :
  - PWA (Progressive Web App)
  - Workbox (Service Worker)
  - IndexedDB (stockage local)
  - React Hook Form + Zod (validation)
  - date-fns (gestion des dates)
  - jsPDF & xlsx (export de données)

## 📋 Prérequis

- Node.js 18+ et npm (ou bun)
- Compte Supabase configuré
- Git

## 🚀 Installation

1. **Cloner le dépôt** :
```bash
git clone https://github.com/hassan312-god/credit-flow.git
cd credit-flow
```

2. **Installer les dépendances** :
```bash
npm install
# ou
bun install
```

3. **Configurer les variables d'environnement** :
Créez un fichier `.env` à la racine du projet avec :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

4. **Configurer Supabase** :
- Créez un projet Supabase
- Exécutez les migrations SQL dans le dossier `supabase/migrations/`
- Configurez les politiques RLS (Row Level Security)

5. **Lancer le serveur de développement** :
```bash
npm run dev
# ou
bun run dev
```

L'application sera accessible sur `http://localhost:5173`

## 📦 Scripts Disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Construit l'application pour la production
- `npm run build:dev` : Construit en mode développement
- `npm run preview` : Prévisualise le build de production
- `npm run lint` : Vérifie le code avec ESLint

## 🏗️ Structure du Projet

```
credit-flow/
├── src/
│   ├── components/       # Composants React réutilisables
│   │   ├── layout/      # Composants de mise en page
│   │   └── ui/          # Composants UI (shadcn/ui)
│   ├── pages/           # Pages de l'application
│   ├── hooks/           # Hooks React personnalisés
│   ├── services/        # Services (localStorage, sync)
│   ├── integrations/    # Intégrations (Supabase)
│   ├── lib/             # Utilitaires
│   └── utils/           # Fonctions utilitaires
├── supabase/
│   ├── migrations/      # Migrations SQL
│   └── config.toml      # Configuration Supabase
├── public/              # Fichiers statiques
└── package.json
```

## 🔐 Sécurité

- Authentification sécurisée via Supabase
- Row Level Security (RLS) activé sur toutes les tables
- Contrôle d'accès basé sur les rôles
- Validation des données côté client et serveur
- Stockage local sécurisé pour le mode hors ligne

## 📱 Mode Hors Ligne

L'application supporte un fonctionnement complet hors ligne grâce à :
- IndexedDB pour le stockage local
- Service Worker pour la mise en cache
- Synchronisation automatique au retour de la connexion
- Queue des actions hors ligne

Pour plus de détails, consultez [OFFLINE_STORAGE.md](./OFFLINE_STORAGE.md)

## 🌐 Déploiement

### Déploiement sur Vercel/Netlify

1. Connectez votre dépôt GitHub
2. Configurez les variables d'environnement
3. Déployez automatiquement

### Build de production

```bash
npm run build
```

Les fichiers optimisés seront dans le dossier `dist/`

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👨‍💻 Auteur

**Hassan**
- GitHub: [@hassan312-god](https://github.com/hassan312-god)

## 📞 Support

Pour toute question ou problème, veuillez ouvrir une [issue](https://github.com/hassan312-god/credit-flow/issues) sur GitHub.

---

**Note** : Cette application est en développement actif. Certaines fonctionnalités peuvent être sujettes à des modifications.
