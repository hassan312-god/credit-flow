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
    echo "⚠️  $file n'est pas un PNG valide"
    file "$ICON_DIR/$file"
  else
    echo "✅ $file est valide"
  fi
done

# Vérifier les autres formats
if [ -f "$ICON_DIR/icon.ico" ]; then
  echo "✅ icon.ico existe"
else
  echo "⚠️  icon.ico manquant (requis pour Windows)"
fi

if [ -f "$ICON_DIR/icon.icns" ]; then
  echo "✅ icon.icns existe"
else
  echo "⚠️  icon.icns manquant (requis pour macOS)"
fi

echo "✅ Toutes les icônes requises sont présentes"
