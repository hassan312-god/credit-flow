# GitHub Actions Setup Guide

## 🚀 Configuration du build automatique avec Tauri Action

### 1. **Secrets GitHub requis**

Ajoutez ces secrets dans votre repository GitHub (`Settings > Secrets and variables > Actions`):

#### `TAURI_PRIVATE_KEY` (obligatoire pour build signé)
- **Contenu** : tout le contenu du fichier `src-tauri/tauri.key` (y compris les lignes `-----BEGIN...` et `-----END...`)
- **Où le mettre** : GitHub > Repo > **Settings** > **Secrets and variables** > **Actions** > **New repository secret** > Nom `TAURI_PRIVATE_KEY`

#### `TAURI_KEY_PASSWORD` (obligatoire si la clé est protégée par mot de passe)
- **Contenu** : le mot de passe de la clé privée (celui utilisé à la génération)
- **Où le mettre** : même menu > **New repository secret** > Nom `TAURI_KEY_PASSWORD`

⚠️ **Ne jamais** committer le fichier `tauri.key` ou le mot de passe dans le code ou les discussions. Si un mot de passe a été exposé, régénérez une nouvelle clé (`cargo tauri signer generate`) et mettez à jour les secrets GitHub.

### 2. **Configuration du workflow**

Le workflow `.github/workflows/build.yml` est configuré pour:

- **Build multi-plateforme**: Windows, macOS (Intel/ARM), Linux
- **Déclencheurs**:
  - Push sur la branche `main`
  - Tags de version (ex: `v0.1.2`)
  - Pull requests (build seulement, pas de release)

### 3. **Processus de build**

1. **Installation des dépendances** système selon la plateforme
2. **Setup Rust** avec les cibles appropriées
3. **Cache** pour accélérer les builds suivants
4. **Build de l'application** avec Tauri
5. **Création de release GitHub** avec tous les artifacts
6. **Upload des fichiers** de mise à jour (`latest.json`, signatures)

### 4. **Fichiers générés**

#### Windows
- `.msi` - Installateur Windows (recommandé)
- `.exe` - Exécutable portable
- `.sig` - Signature numérique

#### macOS
- `.dmg` - Image disque macOS
- `.app` - Application macOS
- `.sig` - Signature numérique

#### Linux
- `.AppImage` - Application portable Linux
- `.deb` - Package Debian/Ubuntu
- `.sig` - Signature numérique

### 5. **Mise à jour automatique**

Le workflow génère automatiquement:
- `latest.json` pour le système d'updater
- Signatures numériques pour la vérification
- Release GitHub avec tous les fichiers

### 6. **Utilisation**

#### Pour créer une nouvelle version:
```bash
git tag v0.1.3
git push origin v0.1.3
```

#### Pour déployer sur main:
```bash
git push origin main
```

### 7. **Relancer le workflow Build Windows manuellement**
1. Allez dans **Actions** > **Build Windows**
2. Cliquez sur **Run workflow** (à droite)
3. Choisissez la branche (ex. `main`) puis **Run workflow**
4. Si l’étape "Vérifier les secrets" échoue : ajoutez `TAURI_PRIVATE_KEY` et `TAURI_KEY_PASSWORD` dans **Settings** > **Secrets and variables** > **Actions** (voir §1 ci‑dessus).

### 8. **Publier une release à partir du build local (si GitHub Actions n’arrive pas à builder)**

Si le workflow **Build Windows** échoue sur GitHub, vous pouvez builder sur votre PC et publier la release vous‑même :

1. **Builder localement**
   ```powershell
   npm run tauri:build:windows
   ```
   Les fichiers sont générés dans `src-tauri/target/x86_64-pc-windows-msvc/release/` (`.msi` dans `bundle/msi/`, `.exe` à la racine).

2. **Installer GitHub CLI** (si besoin)
   ```powershell
   winget install GitHub.cli
   gh auth login
   ```

3. **Publier la release sur GitHub**
   ```powershell
   .\scripts\release-from-local.ps1
   ```
   La version est lue depuis `src-tauri/tauri.conf.json`. Pour forcer une version : `.\scripts\release-from-local.ps1 0.1.1`

4. La release apparaît sous **Releases** avec le `.msi` et l’`.exe`. Vous pouvez ensuite travailler à partir de cette release (téléchargements, updater, etc.).

### 9. **Workflow Verify (frontend + secrets)**
- **Actions** > **Verify (Frontend, Backend, Secrets)** : lint, build frontend, build Tauri (sans bundle).
- **Run workflow** : déclenche aussi la vérification que les secrets TAURI sont configurés (sans afficher les valeurs).

### 10. **Dépannage**

#### Erreurs communes:
- **Missing secrets**: Vérifiez que `TAURI_PRIVATE_KEY` et `TAURI_KEY_PASSWORD` sont définis dans Settings > Secrets
- **Build failures**: Consultez les logs dans l’onglet **Actions**
- **Permission denied**: Le workflow doit avoir les permissions `contents: write` si besoin

#### Logs détaillés:
- Chaque étape du workflow est loggée
- Les erreurs de build Tauri sont affichées en détail
- Les artifacts uploadés sont listés à la fin

---

**Note**: Ce workflow utilise `tauri-apps/tauri-action@v1` qui est la version stable recommandée.
