# Modifications pour l'Auto-Updater

## 📝 Fichiers modifiés

### Configuration Tauri

1. **`src-tauri/Cargo.toml`**
   - Ajouté : `tauri-plugin-updater = "2.0"`

2. **`src-tauri/tauri.conf.json`**
   - Ajouté : `"createUpdaterArtifacts": true` dans `bundle`
   - Ajouté : Configuration `plugins.updater` avec endpoint GitHub et placeholder pour la clé publique

3. **`src-tauri/src/main.rs`**
   - Ajouté : `.plugin(tauri_plugin_updater::Builder::new().build())`

### Frontend React

4. **`src/hooks/useUpdater.tsx`** (NOUVEAU)
   - Hook React pour gérer les mises à jour
   - Fonctions : `checkForUpdates`, `downloadUpdate`, `installUpdate`, `downloadAndInstall`

5. **`src/pages/Settings.tsx`**
   - Ajouté : Section "Mises à jour" avec interface utilisateur
   - Import conditionnel du hook updater (uniquement dans Tauri)

### GitHub Actions

6. **`.github/workflows/release.yml`** (NOUVEAU)
   - Workflow pour créer automatiquement des releases
   - Build pour Windows, macOS, Linux
   - Upload automatique des fichiers .exe, .app, .AppImage en plus des installateurs

### Documentation

7. **`AUTO_UPDATE_SETUP.md`** (NOUVEAU)
   - Guide complet de configuration des mises à jour automatiques
   - Instructions pour générer les clés
   - Configuration GitHub Secrets
   - Checklist de test

8. **`README.md`**
   - Ajouté : Section "Mises à jour automatiques" avec lien vers le guide

9. **`package.json`**
   - Mis à jour : Version à "0.1.0" (doit être synchronisée avec Cargo.toml et tauri.conf.json)

## 🔧 Corrections apportées

### Bug dans Horaires.tsx

**Problème** : Erreur "Erreur lors du chargement des horaires" dans l'onglet Paramètres

**Solution** :
- Amélioration de la gestion d'erreur dans `fetchSchedules`
- Ajout de `setSessions([])` en cas d'erreur pour éviter un état incohérent
- Messages d'erreur plus détaillés

## ✅ Checklist de test

### Test local

- [x] Plugin updater ajouté dans Cargo.toml
- [x] Configuration updater dans tauri.conf.json
- [x] Plugin initialisé dans main.rs
- [x] Hook useUpdater créé
- [x] Section "Mises à jour" ajoutée dans Settings
- [x] Version synchronisée dans tous les fichiers

### Test de release GitHub

- [ ] Secrets GitHub configurés (TAURI_SIGNING_PRIVATE_KEY)
- [ ] Clé publique ajoutée dans tauri.conf.json
- [ ] Tag créé et poussé (ex: `git tag v0.1.0 && git push origin v0.1.0`)
- [ ] Workflow GitHub Actions se déclenche
- [ ] Release créée avec tous les fichiers (.msi, .exe, .dmg, .app, .deb, .AppImage)
- [ ] Fichier latest.json généré et accessible

### Test de mise à jour

- [ ] Installer une version antérieure
- [ ] Vérifier les mises à jour depuis Settings
- [ ] Mise à jour détectée
- [ ] Téléchargement fonctionne
- [ ] Installation fonctionne
- [ ] Application redémarre avec nouvelle version

## 📦 Packages à installer

Avant de tester, installer le package updater :

```bash
npm install @tauri-apps/plugin-updater
```

## 🔑 Prochaines étapes

1. **Générer les clés de signature** :
   ```bash
   npm run tauri signer generate -w ~/.tauri/myapp.key
   ```

2. **Ajouter la clé publique** dans `src-tauri/tauri.conf.json` :
   - Remplacer `PASTE_PUBLIC_KEY_HERE` par la clé publique générée

3. **Configurer GitHub Secrets** :
   - `TAURI_SIGNING_PRIVATE_KEY` : Contenu de `~/.tauri/myapp.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : Mot de passe (si utilisé)

4. **Créer une release** :
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
