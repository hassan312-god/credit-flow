# Bucket Storage « avatars » (photo de profil)

Si vous voyez l’erreur **"Bucket not found"** sur la page Profil, le bucket Storage n’existe pas encore dans votre projet Supabase.

## Créer le bucket dans le Dashboard Supabase

1. Ouvrez votre projet sur [supabase.com](https://supabase.com) → **Storage**.
2. Cliquez sur **New bucket**.
3. Renseignez :
   - **Name** : `avatars`
   - **Public bucket** : coché (pour afficher les photos de profil sans token).
4. (Optionnel) Dans les paramètres du bucket :
   - **File size limit** : 2 MB.
   - **Allowed MIME types** : `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
5. Enregistrez.

Ensuite, appliquez les **politiques RLS** sur `storage.objects` (si ce n’est pas déjà fait par la migration) via **Storage → avatars → Policies**, ou en exécutant le SQL de la migration `20260218120000_profiles_avatar_url_and_storage.sql` (partie sur `storage.objects` uniquement).

Après création du bucket, l’upload de la photo de profil fonctionne.
