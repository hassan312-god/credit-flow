# Déploiement sur Vercel

## « Supabase non configuré »

Si l’app affiche **Supabase non configuré**, les variables d’environnement ne sont pas définies côté hébergeur.

### Sur Vercel

1. Ouvrez votre projet sur [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Ajoutez :
   - **Name:** `NUXT_PUBLIC_SUPABASE_URL`  
     **Value:** `https://VOTRE_PROJET.supabase.co`
   - **Name:** `NUXT_PUBLIC_SUPABASE_ANON_KEY`  
     **Value:** la clé anon (publique) de votre projet Supabase (Dashboard Supabase → Settings → API).
3. **Redeploy** le projet (Deployments → … → Redeploy) pour que les variables soient prises en compte.

En local, copiez `.env.example` en `.env` et renseignez les mêmes valeurs.

---

## Analytics et scripts bloqués

- **ERR_BLOCKED_BY_CLIENT** : souvent dû à un bloqueur de pub qui bloque le script Vercel Analytics. L’app continue de fonctionner ; le script est chargé uniquement côté client.
- Pour activer **Vercel Web Analytics** : Project Settings → Analytics → enable. Sans cela, le message « Failed to load script » peut apparaître en console (sans impact sur l’app).

## Hydration

Si la console affiche « Hydration completed but contains mismatches », c’est en général bénin (thème / préférence couleur). Le rendu est corrigé côté client après hydratation.

---

## CORS sur la fonction Edge `manage-users`

Si l’app sur Vercel affiche **« blocked by CORS policy »** ou **« preflight request doesn’t pass access control check »** quand elle appelle `https://VOTRE_PROJET.supabase.co/functions/v1/manage-users` :

1. **La fonction doit renvoyer les bons en-têtes CORS**  
   Le code dans `credit-flow-reference/supabase/functions/manage-users/index.ts` est déjà configuré pour :
   - répondre **200** à la requête **OPTIONS** (preflight),
   - renvoyer **`Access-Control-Allow-Origin`** avec l’origine de la requête (ex. `https://credit-flow-eight.vercel.app`) pour que les appels avec `Authorization` soient acceptés.

2. **Il faut redéployer la fonction** sur Supabase pour que ces changements soient pris en compte :
   - **Option A (CLI)** : à la racine du projet (ou dans `credit-flow-reference` si c’est là que se trouve `supabase/`), lancer :
     ```bash
     supabase link --project-ref rrgbccnkkarwasrmfnmc
     supabase functions deploy manage-users
     ```
   - **Option B (Dashboard)** : Supabase Dashboard → **Edge Functions** → ouvrir `manage-users` → **Deploy** / **Redeploy** en important le code à jour (ou en le déployant via l’intégration Git si vous en avez une).

Sans redéploiement, l’ancienne version de la fonction reste active et l’erreur CORS peut persister.
