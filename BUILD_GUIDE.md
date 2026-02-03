# Guide de Build - Application Desktop N'FA KA SÉRUM

Ce guide explique comment builder l'application desktop pour Windows, macOS et Linux.

## 📋 Prérequis Généraux

1. **Node.js 18+** et npm installés
2. **Rust** installé via [rustup.rs](https://rustup.rs/)
3. **Git** installé
4. Les dépendances du projet installées : `npm install`

## 🪟 Build pour Windows

### Prérequis Windows

1. **Rust** : Installez depuis [rustup.rs](https://rustup.rs/)
2. **Microsoft C++ Build Tools** :
   - Téléchargez depuis : https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Ou installez Visual Studio avec les outils C++
3. **WebView2** : Installé automatiquement par Tauri

### Commandes de Build

```bash
# Build pour Windows (64-bit)
npm run tauri:build:windows

# Ou build automatique pour votre OS
npm run tauri:build
```

### Fichiers générés

Les fichiers seront dans : `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/`

- **`.msi`** : Installateur Windows (recommandé pour distribution)
- **`.exe`** : Exécutable portable (peut être distribué directement)

## 🍎 Build pour macOS

### Prérequis macOS

1. **Rust** : Installez depuis [rustup.rs](https://rustup.rs/)
2. **Xcode Command Line Tools** :
   ```bash
   xcode-select --install
   ```
3. **Pour signer l'application** (optionnel, pour distribution) :
   - Certificat de développeur Apple
   - Configurez dans `tauri.conf.json` → `bundle.macOS.signingIdentity`

### Commandes de Build

```bash
# Build pour Mac Apple Silicon (M1/M2/M3)
npm run tauri:build:macos

# Build pour Mac Intel
npm run tauri:build:macos:intel

# Ou build automatique pour votre OS
npm run tauri:build
```

### Fichiers générés

**Pour Apple Silicon** : `src-tauri/target/aarch64-apple-darwin/release/bundle/`
**Pour Intel** : `src-tauri/target/x86_64-apple-darwin/release/bundle/`

- **`.dmg`** : Image disque macOS (recommandé pour distribution)
- **`.app`** : Application macOS (peut être copiée dans Applications)

## 🐧 Build pour Linux

### Prérequis Linux

1. **Rust** : Installez depuis [rustup.rs](https://rustup.rs/)

2. **Dépendances système** :

   **Ubuntu/Debian** :
   ```bash
   sudo apt update
   sudo apt install -y \
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

   **Fedora** :
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

   **Arch Linux** :
   ```bash
   sudo pacman -S \
     webkit2gtk \
     base-devel \
     curl \
     wget \
     openssl \
     libxdo \
     libappindicator \
     librsvg
   ```

### Commandes de Build

```bash
# Build pour Linux (64-bit)
npm run tauri:build:linux

# Ou build automatique pour votre OS
npm run tauri:build
```

### Fichiers générés

Les fichiers seront dans : `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/`

- **`.deb`** : Package Debian/Ubuntu (recommandé pour distribution)
- **`.AppImage`** : Application portable Linux (fonctionne sur toutes les distributions)
- **`.rpm`** : Package RPM (si configuré)

## 🔄 Build Multi-Plateforme

### Option 1 : Build sur chaque OS

La méthode la plus simple est de builder sur chaque OS cible :
- Windows → Build sur Windows
- macOS → Build sur macOS
- Linux → Build sur Linux

### Option 2 : GitHub Actions (CI/CD)

Créez un fichier `.github/workflows/build.yml` pour automatiser les builds :

```yaml
name: Build Tauri App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: 'windows-latest'
            args: '--target x86_64-pc-windows-msvc'
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'ubuntu-latest'
            args: '--target x86_64-unknown-linux-gnu'
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - uses: dtolnay/rust-toolchain@stable
      - name: Install dependencies
        run: npm install
      - name: Build frontend
        run: npm run build
      - name: Build Tauri
        run: npm run tauri build -- ${{ matrix.args }}
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}
          path: src-tauri/target/*/release/bundle/
```

## 📦 Distribution des Builds

### Windows

- **`.msi`** : Pour distribution via installateur
- **`.exe`** : Pour distribution portable (pas d'installation requise)

### macOS

- **`.dmg`** : Pour distribution (drag & drop dans Applications)
- **`.app`** : Peut être distribué directement (mais `.dmg` est préféré)

### Linux

- **`.deb`** : Pour distributions Debian/Ubuntu
- **`.AppImage`** : Pour toutes les distributions Linux (portable, pas d'installation)

## 🐛 Dépannage

### Erreur "WebView2 not found" (Windows)

Installez WebView2 Runtime depuis : https://developer.microsoft.com/microsoft-edge/webview2/

### Erreur "Xcode Command Line Tools" (macOS)

Exécutez : `xcode-select --install`

### Erreur de dépendances (Linux)

Vérifiez que toutes les dépendances système sont installées (voir section Prérequis Linux).

### Erreur de compilation Rust

Vérifiez que Rust est à jour :
```bash
rustup update
```

## 📝 Notes

- Les builds peuvent prendre plusieurs minutes la première fois
- Les builds suivants seront plus rapides grâce au cache
- La taille des builds finaux varie entre 20-50 MB selon l'OS
- Les builds de production sont optimisés et minifiés
