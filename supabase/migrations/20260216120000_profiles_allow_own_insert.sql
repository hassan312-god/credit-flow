-- Allow users to INSERT their own profile row so that upsert() works on the settings profile page.
-- Without this, "new row violates row-level security policy" occurs when the app uses .upsert()
-- (the INSERT part of upsert is blocked; UPDATE was already allowed via "Users can update their own profile").

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
