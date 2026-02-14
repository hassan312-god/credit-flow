# Guide GitHub Actions - Build Automatique

Ce guide explique comment utiliser GitHub Actions pour builder automatiquement l'application pour Windows, macOS et Linux.

## 🚀 Workflows Disponibles

### 1. Build Linux (`build-linux.yml`)

Build automatique pour Linux à chaque push sur `main` ou lors de la création d'un tag `v*`.

**Déclenchement** :
- Push sur la branche `main`
- Création d'un tag `v*` (ex: `v0.1.0`)
- Pull Request vers `main`
- Déclenchement manuel depuis l'onglet "Actions"

### 2. Build Windows (`build-windows.yml`)

Build automatique pour Windows.

**Déclenchement** : Identique au build Linux

### 3. Build macOS (`build-macos.yml`)

Build automatique pour macOS (Apple Silicon).

**Déclenchement** : Identique au build Linux

### 4. Build All Platforms (`build-all.yml`)

Build simultané pour tous les OS (Windows, macOS, Linux).

**Déclenchement** :
- Création d'un tag `v*`
- Publication d'une release GitHub
- Déclenchement manuel

## 📋 Utilisation

### Méthode 1 : Push sur main (Build Linux uniquement)

```bash
git add .
git commit -m "Mise à jour"
git push origin main
```

Le workflow `build-linux.yml` se déclenchera automatiquement.

### Méthode 2 : Créer un tag (Build Linux)

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tous les workflows se déclencheront.

### Méthode 3 : Déclenchement manuel

1. Allez sur GitHub → Onglet **"Actions"**
2. Sélectionnez le workflow souhaité (ex: "Build Linux")
3. Cliquez sur **"Run workflow"**
4. Sélectionnez la branche
5. Cliquez sur **"Run workflow"**

### Méthode 4 : Build tous les OS

```bash
# Créer un tag
git tag v0.1.0
git push origin v0.1.0

# Ou créer une release sur GitHub
```

Le workflow `build-all.yml` buildera pour tous les OS simultanément.

## 📥 Télécharger les Artefacts

1. Allez sur GitHub → Onglet **"Actions"**
2. Sélectionnez le workflow exécuté
3. Cliquez sur le run (ex: "Build Linux")
4. Faites défiler jusqu'à **"Artifacts"**
5. Téléchargez le fichier `.zip` contenant les builds

## 📦 Fichiers Générés

### Windows
- `nfa-ka-serum_0.1.0_x64_en-US.msi` (Installateur)
- `nfa-ka-serum.exe` (Exécutable)

### macOS
- `nfa-ka-serum_0.1.0_aarch64.dmg` (Image disque)
- `nfa-ka-serum.app` (Application)

### Linux
- `nfa-ka-serum_0.1.0_amd64.deb` (Package Debian)
- `nfa-ka-serum_0.1.0_amd64.AppImage` (Portable)

## 🔐 Signature (Optionnel)

Pour signer les applications (recommandé pour la distribution) :

1. **Générer une clé Tauri** :
   ```bash
   npm run tauri signer generate -w ~/.tauri/myapp.key
   ```

2. **Ajouter les secrets GitHub** :
   - Allez sur GitHub → Settings → Secrets and variables → Actions
   - Ajoutez (noms **obligatoires** pour tous les workflows) :
     - `TAURI_SIGNING_PRIVATE_KEY` : Contenu du fichier `.key`
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : Mot de passe de la clé

Les workflows utiliseront automatiquement ces secrets pour signer les applications. Si les secrets sont absents, le build peut réussir sans signature (selon la configuration).

## ⚙️ Configuration

### Modifier les déclencheurs

Éditez les fichiers `.github/workflows/*.yml` :

```yaml
on:
  workflow_dispatch:  # Déclenchement manuel
  push:
    branches:
      - main          # Sur push vers main
    tags:
      - 'v*'          # Sur tag v*
  release:
    types: [published] # Sur publication de release
```

### Modifier les versions Node.js/Rust

Dans chaque workflow :

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20  # Modifier ici

- name: Setup Rust
  uses: dtolnay/rust-toolchain@stable
  with:
    targets: x86_64-unknown-linux-gnu  # Modifier ici
```

## 📊 Statut des Builds

Vous pouvez voir le statut des builds :
- Sur la page principale du dépôt (badge)
- Dans l'onglet "Actions"
- Dans les Pull Requests (checks)

## 🔧 Dépannage

### Build échoue

1. Vérifiez les logs dans l'onglet "Actions"
2. Vérifiez que toutes les dépendances sont dans `package.json`
3. Vérifiez que les scripts npm sont corrects
4. **Erreur « Signature PNG invalide » ou crash sur `tauri::generate_context!()`** : les icônes dans `src-tauri/icons/` sont absentes ou corrompues. Voir **ICONS_FIX.md** et régénérer les icônes (ex. `npm run tauri icon path/to/icon.png`).
5. **Échec à l’étape de signature** : vérifiez que les secrets **TAURI_SIGNING_PRIVATE_KEY** et **TAURI_SIGNING_PRIVATE_KEY_PASSWORD** existent bien dans Settings → Secrets and variables → Actions (orthographe exacte).

### Artefacts non disponibles

- Les artefacts sont conservés 30 jours
- Vérifiez que le build s'est terminé avec succès
- Les artefacts ne sont pas générés si le build échoue

### Build trop lent

- Normal pour le premier build (10-30 min)
- Les builds suivants sont plus rapides grâce au cache
- Le build "all platforms" prend plus de temps (3 builds en parallèle)

## 💡 Conseils

1. **Utilisez des tags sémantiques** : `v0.1.0`, `v1.2.3`, etc.
2. **Créez des releases GitHub** pour distribuer les builds
3. **Testez localement** avant de pousser
4. **Vérifiez les logs** en cas d'erreur

## 🎯 Exemple Complet

```bash
# 1. Faire des modifications
git add .
git commit -m "Nouvelle fonctionnalité"

# 2. Pousser (déclenche build Linux)
git push origin main

# 3. Créer un tag pour build tous les OS
git tag v0.1.0
git push origin v0.1.0

# 4. Télécharger les artefacts depuis GitHub Actions
```
