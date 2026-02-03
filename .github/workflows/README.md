# GitHub Actions Setup Guide

## 🚀 Configuration du build automatique avec Tauri Action

### 1. **Secrets GitHub requis**

Ajoutez ces secrets dans votre repository GitHub (`Settings > Secrets and variables > Actions`):

#### `TAURI_PRIVATE_KEY`
- Contenu: Le contenu de votre clé privée `tauri.key`
- Obtenu depuis: `src-tauri/tauri.key`

#### `TAURI_KEY_PASSWORD` (optionnel)
- Contenu: Le mot de passe de votre clé privée (si vous en avez défini un)
- Obtenu depuis: Le mot de passe que vous avez entré lors de la génération

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

### 7. **Dépannage**

#### Erreurs communes:
- **Missing secrets**: Vérifiez que `TAURI_PRIVATE_KEY` est configuré
- **Build failures**: Vérifiez les logs dans l'onglet "Actions" de GitHub
- **Permission denied**: Assurez-vous que le workflow a les permissions `contents: write`

#### Logs détaillés:
- Chaque étape du workflow est loggée
- Les erreurs de build Tauri sont affichées en détail
- Les artifacts uploadés sont listés à la fin

---

**Note**: Ce workflow utilise `tauri-apps/tauri-action@v1` qui est la version stable recommandée.
