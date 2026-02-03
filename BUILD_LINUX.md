# Guide de Build Linux - N'FA KA SÉRUM

Ce guide explique comment builder l'application desktop pour Linux depuis différents environnements.

## 🐧 Option 1 : Build sur Linux (Recommandé)

### Prérequis

1. **Système Linux** (Ubuntu, Debian, Fedora, Arch, etc.)
2. **Rust** installé via [rustup.rs](https://rustup.rs/)
3. **Node.js 18+** et npm
4. **Dépendances système** (voir ci-dessous)

### Installation des dépendances système

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Fedora/RHEL/CentOS

```bash
sudo dnf install -y \
    webkit2gtk3-devel.x86_64 \
    openssl-devel \
    curl \
    wget \
    file \
    libX11-devel \
    libXdo-devel \
    libindicator \
    librsvg2-devel
```

#### Arch Linux

```bash
sudo pacman -S --noconfirm \
    webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    libxdo \
    libappindicator \
    librsvg
```

### Build manuel

```bash
# Installer les dépendances npm
npm install

# Builder le frontend
npm run build

# Builder l'application Tauri
npm run tauri:build:linux
```

### Build avec script automatique

```bash
chmod +x build-linux.sh
./build-linux.sh
```

Le script installera automatiquement les dépendances et effectuera le build.

## 🐳 Option 2 : Build avec Docker (depuis Windows/Mac)

Cette méthode permet de builder pour Linux même si vous êtes sur Windows ou macOS.

### Prérequis

- Docker installé et en cours d'exécution
- Git

### Build avec Docker

```bash
# Windows (PowerShell) ou Mac
chmod +x build-linux-docker.sh
./build-linux-docker.sh
```

Ou manuellement :

```bash
# Builder l'image Docker
docker build -f Dockerfile.linux-build -t tauri-linux-builder .

# Exécuter le build
docker run --rm \
    -v $(pwd)/dist/linux:/app/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle \
    tauri-linux-builder
```

Les fichiers seront dans `./dist/linux/`

## 🔄 Option 3 : Build avec GitHub Actions

Cette méthode automatise le build Linux à chaque push ou tag.

### Configuration

Le fichier `.github/workflows/build-linux.yml` est déjà configuré.

### Utilisation

1. **Poussez votre code sur GitHub** :
   ```bash
   git push origin main
   ```

2. **Ou créez un tag pour déclencher le build** :
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **Téléchargez les artefacts** :
   - Allez sur GitHub → Onglet "Actions"
   - Sélectionnez le workflow "Build Linux"
   - Téléchargez les artefacts depuis l'onglet "Artifacts"

### Avantages

- ✅ Build automatique à chaque push
- ✅ Pas besoin de machine Linux
- ✅ Builds reproductibles
- ✅ Artefacts stockés pendant 30 jours

## 📦 Fichiers générés

Après le build, vous trouverez :

### Package Debian (.deb)
- **Emplacement** : `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/`
- **Usage** : Installation sur Debian/Ubuntu
- **Installation** : `sudo dpkg -i nfa-ka-serum_0.1.0_amd64.deb`

### AppImage (Portable)
- **Emplacement** : `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/`
- **Usage** : Application portable, fonctionne sur toutes les distributions
- **Exécution** : 
  ```bash
  chmod +x nfa-ka-serum_0.1.0_amd64.AppImage
  ./nfa-ka-serum_0.1.0_amd64.AppImage
  ```

## 🔧 Dépannage

### Erreur "libwebkit2gtk-4.1-dev not found"

Installez les dépendances système (voir section Installation).

### Erreur "rustc not found"

Installez Rust :
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Erreur de compilation Rust

Mettez à jour Rust :
```bash
rustup update
cargo clean
npm run tauri:build:linux
```

### Erreur Docker "Cannot connect to Docker daemon"

Assurez-vous que Docker est en cours d'exécution :
```bash
# Linux
sudo systemctl start docker

# Windows/Mac
# Démarrez Docker Desktop
```

### Build très lent

- Premier build : Normal (10-30 minutes)
- Builds suivants : Plus rapides grâce au cache
- Si toujours lent : Vérifiez l'espace disque et la RAM

## 📝 Notes

- **Taille des builds** : Environ 20-50 MB
- **Temps de build** : 10-30 minutes (première fois), 5-10 minutes (suivants)
- **Compatibilité** : Linux x86_64 (64-bit)
- **Distribution** : Les fichiers `.deb` et `.AppImage` peuvent être distribués directement

## 🚀 Distribution

### Package Debian (.deb)

Idéal pour :
- Distribution via dépôt APT
- Installation système
- Intégration avec gestionnaires de paquets

### AppImage

Idéal pour :
- Distribution directe aux utilisateurs
- Applications portables
- Pas d'installation requise
- Compatible avec toutes les distributions Linux
