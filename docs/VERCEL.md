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
