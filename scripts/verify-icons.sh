#!/bin/bash
# Script pour vérifier que les icônes sont valides

set -e

ICON_DIR="src-tauri/icons"

echo "🔍 Vérification des icônes..."

if [ ! -d "$ICON_DIR" ]; then
  echo "❌ Le dossier $ICON_DIR n'existe pas"
  exit 1
fi

echo "📁 Fichiers dans $ICON_DIR:"
ls -lh "$ICON_DIR"

# Vérifier les fichiers PNG requis
REQUIRED_FILES=(
  "32x32.png"
  "128x128.png"
  "128x128@2x.png"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$ICON_DIR/$file" ]; then
    echo "❌ Fichier manquant: $file"
    exit 1
  fi
  
  # Vérifier que c'est un fichier PNG valide
  if ! file "$ICON_DIR/$file" | grep -q "PNG"; then
    echo "❌ $file n'est pas un PNG valide (tauri::generate_context!() plantera)"
    file "$ICON_DIR/$file"
    exit 1
  fi
  echo "✅ $file est valide"
done

# Exiger icon.ico et icon.icns (requis par tauri.conf.json)
if [ ! -f "$ICON_DIR/icon.ico" ]; then
  echo "❌ icon.ico manquant (requis pour Windows)"
  exit 1
fi
echo "✅ icon.ico existe"

if [ ! -f "$ICON_DIR/icon.icns" ]; then
  echo "❌ icon.icns manquant (requis pour macOS)"
  exit 1
fi
echo "✅ icon.icns existe"

echo "✅ Toutes les icônes requises sont présentes et valides"
