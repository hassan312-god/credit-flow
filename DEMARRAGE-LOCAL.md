# Démarrer le dashboard en local (éviter les erreurs 503)

## Erreur « Child socket connection error: connect ENOENT \\.\pipe\nuxt-dev-*.sock »

Sur **Windows**, ce message apparaît quand un processus enfant essaie de se connecter au socket du serveur Nuxt qui n’existe plus (crash, redémarrage, ou plusieurs `pnpm run dev` lancés).

**À faire :**

1. **Arrêter tous les processus** : fermez **tous** les terminaux où `pnpm run dev` tourne (**Ctrl+C**).
2. **Nettoyer et relancer un seul serveur** :
   ```bash
   pnpm run dev:fresh
   ```
3. N’ouvrir **qu’un seul** terminal avec `pnpm run dev` ; ne pas relancer un second `pnpm run dev` tant que le premier tourne.

Si l’erreur revient après un redémarrage du serveur, refaites les étapes 1 et 2.

---

## Pourquoi j’ai des 503 ?

- Le serveur **redémarre** dès que `nuxt.config.ts` est modifié (sauvegarde, formatage, etc.).
- Pendant un redémarrage, les requêtes reçoivent **503** et des erreurs « Cannot pipe to a closed stream ».
- Si un **ancien processus** utilise encore le port 3000 ou 24678, le nouveau serveur est instable.

## Procédure recommandée (à faire dans l’ordre)

### 1. Arrêter tout

- Fermez **tous** les terminaux où `pnpm run dev` tourne (**Ctrl+C**).
- Fermez l’onglet du navigateur sur `http://localhost:3000`.

### 2. Libérer les ports (PowerShell en admin ou terminal projet)

```powershell
# Voir quel processus utilise le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacez 12345 par le PID affiché en dernière colonne)
taskkill /PID 12345 /F
```

Répétez pour le port **24678** si besoin :

```powershell
netstat -ano | findstr :24678
taskkill /PID <PID> /F
```

### 3. Nettoyer et lancer un seul serveur

Dans le dossier du projet :

```bash
pnpm run dev:fresh
```

(Cela exécute `pnpm run clean` puis `pnpm run dev`.)

### 4. Attendre que le serveur soit prêt

Attendez d’avoir dans le terminal :

- `✔ Vite client built`
- `✔ Nuxt Nitro server built`
- `ℹ Vite server warmed up`
- `ℹ Vite client warmed up`

Ça peut prendre **30 secondes à 1 minute** la première fois.

### 5. Ouvrir le site

- Ouvrez **une seule fois** : **http://localhost:3000/**
- Ne **rechargez pas en boucle** tant que la page ne s’est pas affichée une première fois.

### 6. Éviter les redémarrages pendant que vous testez

- **Ne sauvegardez pas** `nuxt.config.ts` tant que le serveur tourne (sinon Nuxt redémarre et vous pouvez avoir à nouveau des 503).
- Si vous devez modifier la config, sauvegardez, attendez la fin du redémarrage (messages « warmed up »), puis rechargez la page.

---

## Si ça ne marche toujours pas

### Option A : Utiliser Node 22

Le projet demande Node **22.x**. Vous avez peut-être Node 24. En principe ça peut marcher, mais en cas de souci :

- Installez **Node 22** (depuis [nodejs.org](https://nodejs.org/) ou avec `nvm` / `fnm`).
- Dans le dossier du projet : `pnpm run dev:fresh`.

### Option B : Autoriser les scripts de build (pnpm)

Si au premier `pnpm install` vous voyez « Ignored build scripts » pour esbuild / parcel watcher :

```bash
pnpm approve-builds
```

Validez les paquets proposés, puis :

```bash
pnpm install
pnpm run dev:fresh
```

### Option C : Déplacer le projet (recommandé sur Windows)

Un chemin long peut poser problème. Copiez le projet dans un dossier court, par exemple :

- `C:\dev\nuxt-dashboard`

Puis dans ce dossier :

```bash
pnpm install
pnpm run dev:fresh
```

### Option D : Tester avec npm

Si les problèmes continuent avec pnpm :

```bash
# Supprimer node_modules et le lockfile pnpm
Remove-Item -Recurse -Force node_modules; Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue

# Installer et lancer avec npm
npm install
npm run dev
```

Ouvrez **http://localhost:3000/** une fois « Vite server warmed up » affiché.
