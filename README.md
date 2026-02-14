# Credit Flow

[![Build Windows](https://github.com/hassan312-god/credit-flow/actions/workflows/build-windows.yml/badge.svg)](https://github.com/hassan312-god/credit-flow/actions/workflows/build-windows.yml)

**📥 [Télécharger l’application](https://github.com/hassan312-god/credit-flow/releases/latest)** (Windows / macOS / Linux) — Page dédiée : [credit-flow-eight.vercel.app/download.html](https://credit-flow-eight.vercel.app/download.html)

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

- **Desktop** :
  - Tauri 2.0 (Application desktop native)
  - Rust (Backend Tauri)

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
- Rust et Cargo (pour l'application desktop Tauri)
  - Installez Rust depuis [rustup.rs](https://rustup.rs/)
  - Windows : Installez également [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

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

L'application sera accessible sur `http://localhost:8080`

## 🖥️ Application Desktop (Tauri)

Cette application peut également être exécutée en tant qu'application desktop native grâce à Tauri.

### Prérequis pour Tauri

1. **Installer Rust** :
   - Téléchargez et installez Rust depuis [rustup.rs](https://rustup.rs/)
   - Sur Windows, installez également [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

2. **Vérifier l'installation** :
```bash
rustc --version
cargo --version
```

### Lancer l'application desktop

**Mode développement** :
```bash
npm run tauri:dev
```

Cette commande va :
- Lancer le serveur Vite de développement
- Compiler l'application Rust
- Ouvrir une fenêtre desktop avec votre application

**Build de production** :
```bash
npm run tauri:build
```

Cette commande va créer un exécutable dans `src-tauri/target/release/bundle/` :
- **Windows** : `.msi` (installateur) et `.exe` (portable)
- **macOS** : `.dmg` (installateur) et `.app` (application)
- **Linux** : `.deb`, `.AppImage`, etc.

### Structure Tauri

```
credit-flow/
├── src-tauri/
│   ├── src/
│   │   └── main.rs        # Code Rust de l'application
│   ├── Cargo.toml         # Configuration Rust
│   ├── tauri.conf.json    # Configuration Tauri
│   ├── build.rs           # Script de build
│   └── icons/             # Icônes de l'application
```

## 📦 Scripts Disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Construit l'application pour la production
- `npm run build:dev` : Construit en mode développement
- `npm run preview` : Prévisualise le build de production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run tauri:dev` : Lance l'application desktop Tauri en mode développement
- `npm run tauri:build` : Construit l'application desktop Tauri pour la production

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

### Application Web

#### Déploiement sur Vercel/Netlify

1. Connectez votre dépôt GitHub
2. Configurez les variables d'environnement
3. Déployez automatiquement

#### Build de production

```bash
npm run build
```

Les fichiers optimisés seront dans le dossier `dist/`

### Application Desktop

#### Build pour tous les OS

**Build pour Windows** (sur Windows) :
```bash
npm run tauri:build:windows
```
Génère : `.msi` (installateur) et `.exe` (portable) dans `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/`

**Build pour macOS** (sur macOS) :
```bash
# Pour Mac avec puce Apple Silicon (M1/M2/M3)
npm run tauri:build:macos

# Pour Mac avec processeur Intel
npm run tauri:build:macos:intel
```
Génère : `.dmg` (installateur) et `.app` (application) dans `src-tauri/target/[arch]-apple-darwin/release/bundle/`

**Build pour Linux** (sur Linux) :
```bash
npm run tauri:build:linux
```
Génère : `.deb`, `.AppImage` dans `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/`

**Build automatique pour la plateforme actuelle** :
```bash
npm run tauri:build
```
Génère les installateurs pour votre OS actuel.

#### Prérequis par OS

**Windows** :
- Rust (via rustup)
- Microsoft C++ Build Tools
- WebView2 (installé automatiquement)

**macOS** :
- Rust (via rustup)
- Xcode Command Line Tools : `xcode-select --install`
- Pour signer l'application (optionnel) : Certificat de développeur Apple

**Linux** :
- Rust (via rustup)
- Dépendances système :
  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

  # Fedora
  sudo dnf install webkit2gtk3-devel.x86_64 \
    openssl-devel \
    curl \
    wget \
    file \
    libX11-devel \
    libXdo-devel \
    libindicator \
    librsvg2-devel

  # Arch Linux
  sudo pacman -S webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    libxdo \
    libappindicator \
    librsvg
  ```

#### Cross-compilation

**Note importante** : Le cross-compilation (builder pour un OS différent) est complexe et nécessite souvent des outils supplémentaires. Il est recommandé de :
- Builder Windows sur Windows
- Builder macOS sur macOS (ou utiliser GitHub Actions)
- Builder Linux sur Linux

Pour automatiser les builds multi-plateformes, utilisez GitHub Actions ou un service CI/CD.

#### Mises à jour automatiques

L'application supporte les mises à jour automatiques via GitHub Releases. Consultez [AUTO_UPDATE_SETUP.md](./AUTO_UPDATE_SETUP.md) pour la configuration complète.

**Configuration rapide** :
1. Générer les clés : `npm run tauri signer generate -w ~/.tauri/myapp.key`
2. Ajouter la clé publique dans `tauri.conf.json`
3. Configurer les secrets GitHub (`TAURI_SIGNING_PRIVATE_KEY`)
4. Créer un tag : `git tag v1.0.0 && git push origin v1.0.0`

Le workflow créera automatiquement une release avec les builds pour tous les OS.

#### Build avec GitHub Actions (Recommandé)

Des workflows GitHub Actions sont configurés pour builder automatiquement l'application :

**Builds automatiques** :
- **Linux** : Se déclenche à chaque push sur `main`
- **Windows, macOS, Linux** : Se déclenche lors de la création d'un tag `v*`

**Utilisation** :
```bash
# Build Linux automatique
git push origin main

# Build tous les OS
git tag v0.1.0
git push origin v0.1.0
```

**Télécharger les builds** :
1. Allez sur GitHub → Onglet "Actions"
2. Sélectionnez le workflow exécuté
3. Téléchargez les artefacts

Pour plus de détails, consultez [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)

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
