import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create client with user's token to verify permissions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check if current user is admin or directeur
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = roleData?.role === 'admin'
    const isDirecteur = roleData?.role === 'directeur'
    const canManageUsers = isAdmin || isDirecteur

    if (!canManageUsers) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'avez pas les permissions nécessaires' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { action, userId, newPassword, suspendUntil, suspendReason, email, password, fullName, phone, role } = await req.json()

    // Handle create_user action - no userId required
    if (action === 'create_user') {
      if (!email || !password || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: 'Email, mot de passe, nom complet et rôle sont requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caractères' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Directeurs cannot create admins
      if (!isAdmin && role === 'admin') {
        return new Response(
          JSON.stringify({ error: 'Seul un administrateur peut créer un compte administrateur' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Create user with admin API - email is automatically confirmed
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      })

      if (createError) {
        console.error('Error creating user:', createError)
        if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
          return new Response(
            JSON.stringify({ error: 'Cet email est déjà utilisé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        return new Response(
          JSON.stringify({ error: `Erreur lors de la création de l'utilisateur: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (!newUserData.user) {
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création de l\'utilisateur' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update profile with phone if provided
      if (phone) {
        await supabaseAdmin
          .from('profiles')
          .update({ phone })
          .eq('id', newUserData.user.id)
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUserData.user.id,
          role,
        })

      if (roleError) {
        console.error('Error assigning role:', roleError)
        // Clean up the created user since role assignment failed
        await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de l\'attribution du rôle' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur créé avec succès', userId: newUserData.user.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // For other actions, userId is required
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId est requis pour cette action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Cannot manage own account
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas gérer votre propre compte via cette interface' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check if target user is admin - only admins can manage admins
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    // Directors cannot manage admins
    if (!isAdmin && targetRoleData?.role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Vous n\'avez pas les permissions pour gérer un administrateur' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Only admins can delete, suspend, unsuspend
    if (!isAdmin && (action === 'delete' || action === 'suspend' || action === 'unsuspend')) {
      return new Response(
        JSON.stringify({ error: 'Seul un administrateur peut effectuer cette action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (targetRoleData?.role === 'admin' && action === 'delete') {
      return new Response(
        JSON.stringify({ error: 'Impossible de supprimer un administrateur' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'delete') {
      // Delete user suspensions first
      await supabaseAdmin
        .from('user_suspensions')
        .delete()
        .eq('user_id', userId)

      // Delete user role first
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Delete profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)

      // Delete user from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la suppression de l\'utilisateur' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur supprimé avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'update_password') {
      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caractères' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword },
      )

      if (updateError) {
        console.error('Error updating password:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la modification du mot de passe' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Mot de passe modifié avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // update_profile: admin or directeur can update full_name and phone
    if (action === 'update_profile') {
      const updates: { full_name?: string, phone?: string | null } = {}
      if (fullName !== undefined)
        updates.full_name = fullName
      if (phone !== undefined)
        updates.phone = phone || null
      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Aucune donnée à mettre à jour (fullName ou phone)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
      if (updateError) {
        console.error('Error updating profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour du profil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Profil mis à jour avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // update_role: admin or directeur can change role (directeur cannot set admin)
    if (action === 'update_role') {
      if (!role) {
        return new Response(
          JSON.stringify({ error: 'Le rôle est requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (!isAdmin && role === 'admin') {
        return new Response(
          JSON.stringify({ error: 'Seul un administrateur peut attribuer le rôle administrateur' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
      if (roleUpdateError) {
        console.error('Error updating role:', roleUpdateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour du rôle' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Rôle mis à jour avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'suspend') {
      if (!suspendUntil) {
        return new Response(
          JSON.stringify({ error: 'La date de fin de suspension est requise' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Check if user is already suspended
      const { data: existingSuspension } = await supabaseAdmin
        .from('user_suspensions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingSuspension) {
        // Update existing suspension
        const { error: updateError } = await supabaseAdmin
          .from('user_suspensions')
          .update({
            suspended_until: suspendUntil,
            reason: suspendReason || null,
            suspended_by: user.id,
            suspended_at: new Date().toISOString(),
          })
          .eq('id', existingSuspension.id)

        if (updateError) {
          console.error('Error updating suspension:', updateError)
          return new Response(
            JSON.stringify({ error: 'Erreur lors de la mise à jour de la suspension' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
      else {
        // Create new suspension
        const { error: insertError } = await supabaseAdmin
          .from('user_suspensions')
          .insert({
            user_id: userId,
            suspended_by: user.id,
            suspended_until: suspendUntil,
            reason: suspendReason || null,
            is_active: true,
          })

        if (insertError) {
          console.error('Error creating suspension:', insertError)
          return new Response(
            JSON.stringify({ error: 'Erreur lors de la création de la suspension' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur suspendu avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'unsuspend') {
      const { error: updateError } = await supabaseAdmin
        .from('user_suspensions')
        .update({
          is_active: false,
          lifted_at: new Date().toISOString(),
          lifted_by: user.id,
        })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (updateError) {
        console.error('Error lifting suspension:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la levée de la suspension' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Suspension levée avec succès' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
