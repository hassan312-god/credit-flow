-- Assign admin role to the specified user
-- User ID: fc2f60ae-8562-4efb-ae88-19eff2fbef35

INSERT INTO public.user_roles (user_id, role)
VALUES ('fc2f60ae-8562-4efb-ae88-19eff2fbef35', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

