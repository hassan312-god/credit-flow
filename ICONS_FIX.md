# Fix pour l'erreur "Signature PNG invalide"

## 🔴 Problème

L'erreur suivante se produit lors du build sur GitHub Actions :

```
erreur: proc macro paniqué
  --> src/main.rs:11:14
   |
11 |         .run(tauri::generate_context!())
   |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = Aide: message: échoué à lire icône /Utilisateurs/runner/work/credit-flow/credit-flow/src-tauri/icons/32x32.png: Signature PNG invalide.
```

## 🔍 Cause

Les fichiers PNG des icônes sont soit :
1. Corrompus dans le dépôt Git
2. Non correctement commités (fichiers binaires)
3. Vides ou invalides

**Indice de corruption** : si tous les fichiers dans `src-tauri/icons/` ont exactement la même taille (octets), ils sont probablement des copies du même fichier (ex. un 128x128 mis à la place du 32x32). Dans ce cas, régénérer les icônes depuis une source unique avec `npm run tauri icon path/to/icon.png` ou ImageMagick (voir ci‑dessous).

## ✅ Solution

### Étape 1 : Vérifier les icônes localement

```bash
# Vérifier que les fichiers existent
ls -la src-tauri/icons/

# Vérifier que ce sont des PNG valides (doit afficher "PNG image data" pour chaque .png)
file src-tauri/icons/*.png

# Tailles attendues (ordre de grandeur) : 32x32.png < 128x128.png < 128x128@2x.png
# Si 32x32.png fait la même taille que 128x128.png, le fichier est probablement incorrect.
```

### Étape 2 : Vérifier dans Git

```bash
# Vérifier que les icônes sont trackées
git ls-files src-tauri/icons/

# Vérifier leur taille
git ls-files -s src-tauri/icons/
```

### Étape 3 : Recréer les icônes si nécessaire

Si les icônes sont corrompues, vous devez les recréer :

1. **Créer une icône source** (1024x1024px recommandé)
2. **Générer les différentes tailles** :
   - 32x32.png
   - 128x128.png
   - 128x128@2x.png (256x256px)
   - icon.ico (Windows)
   - icon.icns (macOS)

3. **Utiliser un outil comme ImageMagick** :
   ```bash
   # Installer ImageMagick
   sudo apt-get install imagemagick  # Linux
   brew install imagemagick          # macOS
   
   # Générer les tailles
   convert icon-source.png -resize 32x32 src-tauri/icons/32x32.png
   convert icon-source.png -resize 128x128 src-tauri/icons/128x128.png
   convert icon-source.png -resize 256x256 src-tauri/icons/128x128@2x.png
   ```

4. **Ou utiliser un service en ligne** :
   - https://www.icoconverter.com/
   - https://convertio.co/png-ico/
   - https://cloudconvert.com/png-to-ico

### Étape 4 : Commiter les nouvelles icônes

```bash
# Ajouter les icônes
git add src-tauri/icons/

# Vérifier qu'elles sont bien ajoutées
git status

# Commiter
git commit -m "Fix: Corriger les icônes corrompues"

# Pousser
git push origin main
```

### Étape 5 : Vérifier avec le workflow

Un workflow de vérification a été ajouté : `.github/workflows/fix-icons.yml`

Pour l'exécuter :
1. Allez sur GitHub → Actions
2. Sélectionnez "Fix Icons"
3. Cliquez sur "Run workflow"

## 🛠️ Outils Recommandés

### Générer les icônes depuis une image

**Option 1 : Tauri CLI** (si disponible)
```bash
npm run tauri icon path/to/icon.png
```

**Option 2 : ImageMagick**
```bash
# Créer toutes les tailles depuis une source 1024x1024
for size in 32 128 256; do
  convert icon-source.png -resize ${size}x${size} src-tauri/icons/${size}x${size}.png
done
```

**Option 3 : Services en ligne**
- [AppIcon.co](https://www.appicon.co/)
- [IconKitchen](https://icon.kitchen/)
- [CloudConvert](https://cloudconvert.com/)

## 📋 Checklist

- [ ] Les fichiers PNG existent dans `src-tauri/icons/`
- [ ] Les fichiers PNG sont valides (vérifier avec `file` command)
- [ ] Les fichiers sont commités dans Git (`git ls-files`)
- [ ] Les fichiers ne sont pas vides (vérifier la taille)
- [ ] Le workflow GitHub Actions vérifie les icônes avant le build

## 🔧 Workflows Mis à Jour

Les workflows suivants ont été mis à jour pour vérifier les icônes :
- `build-linux.yml`
- `build-windows.yml`
- `build-macos.yml`
- `build-all.yml`

Ils vérifient maintenant la présence des icônes avant de lancer le build.

## 📝 Note

Si vous continuez à avoir des problèmes :
1. Vérifiez que Git LFS n'est pas utilisé pour les icônes (ou configurez-le correctement)
2. Assurez-vous que les fichiers ne sont pas dans `.gitignore`
3. Vérifiez que les fichiers sont bien des PNG valides avec `file` command
