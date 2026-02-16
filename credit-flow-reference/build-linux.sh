#!/bin/bash
# Script pour builder l'application Tauri pour Linux
# Usage: ./build-linux.sh

set -e

echo "🔧 Installation des dépendances système..."

# Détecter la distribution Linux
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y \
        libwebkit2gtk-4.1-dev \
        build-essential \
        curl \
        wget \
        file \
        libxdo-dev \
        libssl-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev
elif [ -f /etc/redhat-release ]; then
    # Fedora/RHEL/CentOS
    sudo dnf install -y \
        webkit2gtk3-devel.x86_64 \
        openssl-devel \
        curl \
        wget \
        file \
        libX11-devel \
        libXdo-devel \
        libindicator \
        librsvg2-devel
elif [ -f /etc/arch-release ]; then
    # Arch Linux
    sudo pacman -S --noconfirm \
        webkit2gtk \
        base-devel \
        curl \
        wget \
        openssl \
        libxdo \
        libappindicator \
        librsvg
else
    echo "⚠️  Distribution non reconnue. Veuillez installer manuellement les dépendances."
    echo "Consultez BUILD_GUIDE.md pour les dépendances nécessaires."
fi

echo "📦 Installation des dépendances npm..."
npm install

echo "🏗️  Build du frontend..."
npm run build

echo "🔨 Build de l'application Tauri pour Linux..."
npm run tauri:build:linux

echo "✅ Build terminé !"
echo "📁 Fichiers générés dans: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/"
