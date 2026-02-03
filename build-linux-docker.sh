#!/bin/bash
# Script pour builder l'application Linux avec Docker (depuis Windows/Mac)
# Usage: ./build-linux-docker.sh

set -e

echo "🐳 Build Linux avec Docker..."

# Créer un volume pour partager les fichiers de build
docker volume create tauri-linux-build

# Builder l'image et exécuter le build
docker build -f Dockerfile.linux-build -t tauri-linux-builder .

# Exécuter le build et copier les fichiers
docker run --rm \
    -v tauri-linux-build:/app/src-tauri/target \
    tauri-linux-builder

# Créer un conteneur temporaire pour extraire les fichiers
CONTAINER_ID=$(docker create tauri-linux-builder)

# Créer le dossier de sortie
mkdir -p dist/linux

# Copier les fichiers de build
docker cp $CONTAINER_ID:/app/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle ./dist/linux/

# Nettoyer
docker rm $CONTAINER_ID

echo "✅ Build terminé !"
echo "📁 Fichiers dans: ./dist/linux/bundle/"
