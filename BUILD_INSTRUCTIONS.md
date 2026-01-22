# Instructions de Build - Application Desktop

## 🚀 Build Rapide

### Build pour votre OS actuel

```bash
npm run build          # Build le frontend
npm run tauri:build    # Build l'application desktop pour votre OS
```

Les fichiers seront dans : `src-tauri/target/release/bundle/`

## 📦 Builds Spécifiques par OS

### Windows

```bash
npm run tauri:build:windows
```

**Fichiers générés** :
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/nfa-ka-serum_0.1.0_x64_en-US.msi` (Installateur)
- `src-tauri/target/x86_64-pc-windows-msvc/release/nfa-ka-serum.exe` (Exécutable)

### macOS

**Apple Silicon (M1/M2/M3)** :
```bash
npm run tauri:build:macos
```

**Intel** :
```bash
npm run tauri:build:macos:intel
```

**Fichiers générés** :
- `src-tauri/target/[arch]-apple-darwin/release/bundle/dmg/nfa-ka-serum_0.1.0_aarch64.dmg` (Image disque)
- `src-tauri/target/[arch]-apple-darwin/release/bundle/macos/nfa-ka-serum.app` (Application)

### Linux

```bash
npm run tauri:build:linux
```

**Fichiers générés** :
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/nfa-ka-serum_0.1.0_amd64.deb` (Package Debian)
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/nfa-ka-serum_0.1.0_amd64.AppImage` (Portable)

## ⚠️ Notes Importantes

1. **Premier build** : Peut prendre 10-30 minutes (compilation Rust)
2. **Builds suivants** : Plus rapides grâce au cache
3. **Cross-compilation** : Complexe, builder sur chaque OS cible est recommandé
4. **Taille** : Les builds finaux font environ 20-50 MB

## 🔧 Dépannage

### Erreur "rustc not found"
Installez Rust : https://rustup.rs/

### Erreur de compilation Rust
```bash
rustup update
cargo clean
npm run tauri:build
```

### Erreur WebView2 (Windows)
Installez WebView2 Runtime : https://developer.microsoft.com/microsoft-edge/webview2/

### Erreur dépendances Linux
Voir `BUILD_GUIDE.md` pour les dépendances spécifiques à votre distribution.
