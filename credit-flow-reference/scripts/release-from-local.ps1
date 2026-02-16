# Publie le build Tauri Windows local comme release GitHub.
# Utilise ce script quand GitHub Actions n'arrive pas à builder l'app.
#
# Prérequis:
#   1. Avoir buildé localement: npm run tauri:build:windows
#   2. Avoir installé GitHub CLI: winget install GitHub.cli
#   3. S'être connecté: gh auth login
#
# Usage: .\scripts\release-from-local.ps1 [version]
#   version: optionnel, ex. 0.1.0 ou v0.1.0 (sinon lu depuis src-tauri/tauri.conf.json)

param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot + "\.."
$TauriConf = Join-Path $RepoRoot "src-tauri\tauri.conf.json"
$TargetDir = Join-Path $RepoRoot "src-tauri\target\x86_64-pc-windows-msvc\release"

if (-not (Test-Path $TauriConf)) {
  Write-Error "tauri.conf.json introuvable: $TauriConf"
  exit 1
}

if ($Version -eq "") {
  $Version = (Get-Content $TauriConf | ConvertFrom-Json).version
}
if (-not ($Version -match "^v")) {
  $Version = "v" + $Version
}

$MsiDir = Join-Path $TargetDir "bundle\msi"
$ExePath = Join-Path $TargetDir "nfa-ka-serum.exe"

if (-not (Test-Path $ExePath)) {
  Write-Error "Build introuvable. Lancez d'abord: npm run tauri:build:windows"
  Write-Error "Chemin attendu: $ExePath"
  exit 1
}

$MsiFiles = Get-ChildItem -Path $MsiDir -Filter "*.msi" -ErrorAction SilentlyContinue
$FilesToUpload = @($ExePath)
if ($MsiFiles) {
  $FilesToUpload += $MsiFiles.FullName
}

Write-Host "Version: $Version"
Write-Host "Fichiers a uploader:"
$FilesToUpload | ForEach-Object { Write-Host "  $_" }

# Vérifier que gh est installé
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Error "GitHub CLI (gh) non trouvé. Installez-le: winget install GitHub.cli puis gh auth login"
  exit 1
}

# Créer la release et uploader les fichiers (ou seulement uploader si la release existe déjà)
$out = gh release create $Version $FilesToUpload `
  --repo hassan312-god/credit-flow `
  --title "N'FA KA SÉRUM $Version" `
  --notes "Build Windows (local). Installer avec le .msi ou utiliser l'exe portable." `
  --latest 2>&1

if ($LASTEXITCODE -ne 0) {
  if ($out -match "already exists|tag already exists") {
    Write-Host "La release $Version existe deja. Upload des fichiers..."
    foreach ($f in $FilesToUpload) {
      if (Test-Path $f) {
        gh release upload $Version $f --repo hassan312-god/credit-flow --clobber
        Write-Host "  OK: $(Split-Path $f -Leaf)"
      }
    }
  } else {
    Write-Error "Echec: $out"
    exit 1
  }
} else {
  Write-Host "Release creee et fichiers uploades."
}

Write-Host ""
Write-Host "Release disponible: https://github.com/hassan312-god/credit-flow/releases/tag/$Version"
Write-Host "Pour que l'updater in-app voie cette version, le fichier latest.json sur la release doit pointer vers l'URL du .msi. Vous pouvez le generer avec Tauri (createUpdaterArtifacts) ou l'ajouter manuellement."
