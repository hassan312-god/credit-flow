# Configuration des Mises à Jour Automatiques

Ce guide explique comment configurer les mises à jour automatiques pour l'application Tauri.

## 🔑 Étape 1 : Générer les clés de signature

Les mises à jour doivent être signées cryptographiquement pour garantir leur sécurité.

### Générer la paire de clés

```bash
npm run tauri signer generate -w ~/.tauri/myapp.key
```

Cette commande va :
1. Vous demander un mot de passe (optionnel mais recommandé)
2. Générer une clé privée dans `~/.tauri/myapp.key`
3. Afficher la clé publique dans le terminal

### Sauvegarder la clé publique

Copiez la clé publique affichée et remplacez `PASTE_PUBLIC_KEY_HERE` dans `src-tauri/tauri.conf.json` :

```json
{
  "plugins": {
    "updater": {
      "pubkey": "VOTRE_CLE_PUBLIQUE_ICI"
    }
  }
}
```

## 🔐 Étape 2 : Configurer GitHub Secrets

1. Allez sur votre dépôt GitHub
2. Settings → Secrets and variables → Actions
3. Cliquez sur "New repository secret"
4. Ajoutez les secrets suivants :

### TAURI_SIGNING_PRIVATE_KEY

- **Nom** : `TAURI_SIGNING_PRIVATE_KEY`
- **Valeur** : Contenu complet du fichier `~/.tauri/myapp.key`
  ```bash
  cat ~/.tauri/myapp.key
  ```
  Copiez tout le contenu (y compris les lignes `-----BEGIN...` et `-----END...`)

### TAURI_SIGNING_PRIVATE_KEY_PASSWORD

- **Nom** : `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Valeur** : Le mot de passe que vous avez utilisé lors de la génération (ou laissez vide si aucun)

## 📦 Étape 3 : Créer une release

### Mettre à jour les versions

Avant de créer une release, mettez à jour la version dans :

1. **`src-tauri/Cargo.toml`** :
   ```toml
   [package]
   version = "0.1.0"  # Mettre à jour ici
   ```

2. **`src-tauri/tauri.conf.json`** :
   ```json
   {
     "version": "0.1.0"  // Mettre à jour ici
   }
   ```

3. **`package.json`** :
   ```json
   {
     "version": "0.1.0"  // Mettre à jour ici
   }
   ```

### Créer le tag et pousser

```bash
# Commiter les changements de version
git add .
git commit -m "Release v0.1.0"
git push

# Créer et pousser le tag
git tag v0.1.0
git push origin v0.1.0
```

Le workflow GitHub Actions se déclenchera automatiquement et :
- Buildera l'application pour Windows, macOS et Linux
- Créera une GitHub Release
- Uploadera les installateurs (.msi, .dmg, .deb, .AppImage)
- Générera automatiquement le fichier `latest.json` pour l'updater

## 🔍 Étape 4 : Vérifier que tout fonctionne

### Vérifier la release GitHub

1. Allez sur GitHub → Releases
2. Vérifiez que la release a été créée
3. Vérifiez que les fichiers sont uploadés :
   - `nfa-ka-serum_X.X.X_x64_en-US.msi` (Windows)
   - `nfa-ka-serum_X.X.X_aarch64.dmg` (macOS)
   - `nfa-ka-serum_X.X.X_amd64.deb` (Linux)
   - `latest.json` (manifest updater)

### Vérifier l'endpoint

L'endpoint de mise à jour devrait être accessible :
```
https://github.com/hassan312-god/credit-flow/releases/latest/download/latest.json
```

**Note** : Si le dépôt est privé, cet endpoint ne sera pas accessible publiquement. Voir la section "Dépôt privé" ci-dessous.

## 🧪 Tester les mises à jour

1. Installez une version antérieure de l'application
2. Ouvrez l'application
3. Allez dans **Paramètres** → Section "Mises à jour"
4. Cliquez sur "Vérifier les mises à jour"
5. Si une mise à jour est disponible, cliquez sur "Installer la mise à jour"

## 🔒 Sécurité

### ⚠️ Important

- **NE COMMITEZ JAMAIS** la clé privée (`myapp.key`) dans Git
- Gardez une sauvegarde sécurisée de la clé privée
- Si vous perdez la clé privée, vous ne pourrez plus signer les mises à jour
- Partagez la clé privée uniquement avec les personnes autorisées

### Sauvegarder la clé privée

```bash
# Créer une sauvegarde chiffrée
tar -czf myapp-key-backup.tar.gz ~/.tauri/myapp.key
# Stocker dans un endroit sécurisé (cloud chiffré, coffre-fort, etc.)
```

## 🌐 Dépôt privé

Si votre dépôt GitHub est privé, l'endpoint `latest.json` ne sera pas accessible publiquement. Solutions :

### Option 1 : Rendre le dépôt public (recommandé)

- Les releases GitHub sont publiques même si le code source est privé
- L'endpoint `latest.json` sera accessible publiquement
- Les utilisateurs pourront télécharger les mises à jour

### Option 2 : Utiliser un proxy/serveur

Créez un serveur qui :
1. Récupère `latest.json` depuis GitHub (avec token)
2. Le sert publiquement
3. Mettez à jour l'endpoint dans `tauri.conf.json`

### Option 3 : Utiliser un service de distribution

- Cloudflare Workers
- AWS S3 + CloudFront
- Vercel/Netlify

## 📝 Checklist de test

### Test local

- [ ] Les clés de signature sont générées
- [ ] La clé publique est dans `tauri.conf.json`
- [ ] Le plugin updater est dans `Cargo.toml`
- [ ] Le plugin est initialisé dans `main.rs`
- [ ] Le hook `useUpdater` fonctionne
- [ ] La section "Mises à jour" apparaît dans Settings

### Test de release

- [ ] Les secrets GitHub sont configurés
- [ ] La version est cohérente dans tous les fichiers
- [ ] Le tag est créé et poussé
- [ ] Le workflow GitHub Actions se déclenche
- [ ] La release est créée avec les bons fichiers
- [ ] Le fichier `latest.json` est généré et uploadé
- [ ] L'endpoint `latest.json` est accessible

### Test de mise à jour

- [ ] Installer une version antérieure
- [ ] Vérifier les mises à jour depuis l'app
- [ ] La mise à jour est détectée
- [ ] Le téléchargement fonctionne
- [ ] L'installation fonctionne
- [ ] L'application redémarre avec la nouvelle version

## 🐛 Dépannage

### Erreur "Invalid signature"

- Vérifiez que la clé publique dans `tauri.conf.json` correspond à la clé privée
- Vérifiez que la clé privée dans GitHub Secrets est correcte

### Erreur "Update not found"

- Vérifiez que `latest.json` est accessible publiquement
- Vérifiez que l'endpoint dans `tauri.conf.json` est correct
- Vérifiez que la release GitHub existe

### Le workflow ne se déclenche pas

- Vérifiez que le tag suit le format `vX.Y.Z` (ex: `v1.0.0`)
- Vérifiez que le tag est poussé sur GitHub
- Vérifiez les permissions du workflow dans GitHub Actions

### Les builds échouent

- Vérifiez que les secrets GitHub sont configurés
- Vérifiez les logs du workflow pour plus de détails
- Vérifiez que les dépendances système sont installées (Linux)

## 📚 Ressources

- [Documentation Tauri Updater](https://v2.tauri.app/plugin/updater/)
- [Tauri Action GitHub](https://github.com/tauri-apps/tauri-action)
- [Guide de signature Tauri](https://v2.tauri.app/distribute/sign/)
