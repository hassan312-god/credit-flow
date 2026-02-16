<script setup lang="ts">
import type { AppRole } from '~/types/database'
import { roleLabels as accessRoleLabels } from '~/constants/menuAccess'

definePageMeta({ layout: 'default' })

interface UserWithRole {
  id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  role: AppRole | string | null
}

const users = ref<UserWithRole[]>([])
const loading = ref(true)
const error = ref('')
const createDialogOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const editDialogOpen = ref(false)
const editing = ref(false)
const editError = ref('')
const editUser = ref<UserWithRole | null>(null)
const editForm = ref({ full_name: '', phone: '', role: '' as AppRole | '', new_password: '' })

const { role: currentUserRole } = useAuthRole()
const config = useRuntimeConfig().public
const supabase = useSupabase().value

const roleLabels: Record<string, string> = {
  ...accessRoleLabels,
  agent: 'Agent',
}

const form = ref({
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: '' as AppRole | '',
})

const roleOptions = computed<AppRole[]>(() => {
  const all: AppRole[] = ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement']
  if (currentUserRole.value === 'admin')
    return all
  if (currentUserRole.value === 'directeur')
    return ['directeur', 'agent_credit', 'caissier', 'recouvrement']
  return []
})

function canEditUser(u: UserWithRole) {
  if (roleOptions.value.length === 0)
    return false
  if (currentUserRole.value === 'admin')
    return true
  if (currentUserRole.value === 'directeur')
    return u.role !== 'admin'
  return false
}

const editRoleOptions = computed<AppRole[]>(() => {
  const opts = roleOptions.value
  const u = editUser.value
  if (!u?.role || opts.includes(u.role as AppRole))
    return opts
  return [...opts, u.role as AppRole]
})

const updatingRoleFor = ref<string | null>(null)
const roleUpdateError = ref('')

async function changeRole(u: UserWithRole, newRole: AppRole) {
  if (newRole === (u.role as AppRole))
    return
  if (currentUserRole.value !== 'admin' && (currentUserRole.value === 'directeur' && newRole === 'admin'))
    return
  roleUpdateError.value = ''
  updatingRoleFor.value = u.id
  try {
    const r = await callManageUsers({ action: 'update_role', userId: u.id, role: newRole })
    if (!r.ok) {
      roleUpdateError.value = r.error ?? 'Erreur'
      return
    }
    u.role = newRole
  }
  finally {
    updatingRoleFor.value = null
  }
}

function roleOptionsForUser(u: UserWithRole): AppRole[] {
  if (currentUserRole.value === 'admin')
    return roleOptions.value
  if (currentUserRole.value === 'directeur')
    return u.role === 'admin' ? roleOptions.value : roleOptions.value.filter(r => r !== 'admin')
  return []
}

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: profilesData, error: e1 } = await supabase.from('profiles').select('id, email, full_name, phone, created_at').order('created_at', { ascending: false })
    if (e1)
      throw e1
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role')
    const roleByUser = (rolesData ?? []).reduce((acc: Record<string, string>, r: any) => {
      acc[r.user_id] = r.role
      return acc
    }, {})
    users.value = (profilesData ?? []).map(p => ({
      ...p,
      role: roleByUser[p.id] ?? null,
    }))
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement utilisateurs'
  }
  finally {
    loading.value = false
  }
}

async function createUser() {
  createError.value = ''
  if (!form.value.email.trim() || !form.value.password || !form.value.full_name.trim() || !form.value.role) {
    createError.value = 'Email, mot de passe, nom et rôle sont requis.'
    return
  }
  if (form.value.password.length < 6) {
    createError.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }
  creating.value = true
  try {
    const { data: { session } } = await supabase!.auth.getSession()
    const token = session?.access_token
    if (!token) {
      createError.value = 'Session expirée. Reconnectez-vous.'
      return
    }
    const baseUrl = (config.supabaseUrl as string) || ''
    if (!baseUrl) {
      createError.value = 'Configuration Supabase manquante (NUXT_PUBLIC_SUPABASE_URL).'
      return
    }
    const url = `${baseUrl}/functions/v1/manage-users`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create_user',
        email: form.value.email.trim(),
        password: form.value.password,
        fullName: form.value.full_name.trim(),
        phone: form.value.phone?.trim() || null,
        role: form.value.role,
      }),
    })
    const text = await res.text()
    let data: { error?: string, message?: string } = {}
    try {
      data = text ? JSON.parse(text) : {}
    }
    catch {
      data = { error: text || 'Réponse invalide' }
    }
    if (!res.ok) {
      createError.value = data.error || data.message || `Erreur ${res.status}`
      return
    }
    createDialogOpen.value = false
    form.value = { email: '', password: '', full_name: '', phone: '', role: '' }
    await fetchUsers()
  }
  catch (e: any) {
    createError.value = e?.message || 'Erreur lors de la création'
  }
  finally {
    creating.value = false
  }
}

function openCreateDialog() {
  createError.value = ''
  form.value = { email: '', password: '', full_name: '', phone: '', role: roleOptions.value[0] || '' }
  createDialogOpen.value = true
}

function openEditDialog(u: UserWithRole) {
  editUser.value = u
  editForm.value = {
    full_name: u.full_name,
    phone: u.phone ?? '',
    role: (u.role as AppRole) ?? '',
    new_password: '',
  }
  editError.value = ''
  editDialogOpen.value = true
}

async function callManageUsers(body: Record<string, unknown>): Promise<{ ok: boolean, error?: string }> {
  const { data: { session } } = await supabase!.auth.getSession()
  const token = session?.access_token
  if (!token)
    return { ok: false, error: 'Session expirée. Reconnectez-vous.' }
  const baseUrl = (config.supabaseUrl as string) || ''
  if (!baseUrl)
    return { ok: false, error: 'Configuration Supabase manquante.' }
  const res = await fetch(`${baseUrl}/functions/v1/manage-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: { error?: string, message?: string } = {}
  try { data = text ? JSON.parse(text) : {} }
  catch { data = { error: text || 'Réponse invalide' } }
  if (!res.ok)
    return { ok: false, error: data.error || data.message || `Erreur ${res.status}` }
  return { ok: true }
}

async function saveEdit() {
  const u = editUser.value
  if (!u)
    return
  editError.value = ''
  const { full_name, phone, role: newRole, new_password } = editForm.value
  if (!full_name.trim()) {
    editError.value = 'Le nom est requis.'
    return
  }
  if (!newRole) {
    editError.value = 'Le rôle est requis.'
    return
  }
  if (new_password && new_password.length < 6) {
    editError.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }
  editing.value = true
  try {
    if (full_name.trim() !== u.full_name || phone !== (u.phone ?? '')) {
      const r = await callManageUsers({
        action: 'update_profile',
        userId: u.id,
        fullName: full_name.trim(),
        phone: phone?.trim() || null,
      })
      if (!r.ok) {
        editError.value = r.error
        return
      }
    }
    if (newRole !== (u.role ?? '')) {
      const r = await callManageUsers({ action: 'update_role', userId: u.id, role: newRole })
      if (!r.ok) {
        editError.value = r.error
        return
      }
    }
    if (new_password) {
      const r = await callManageUsers({ action: 'update_password', userId: u.id, newPassword: new_password })
      if (!r.ok) {
        editError.value = r.error
        return
      }
    }
    editDialogOpen.value = false
    editUser.value = null
    await fetchUsers()
  }
  finally {
    editing.value = false
  }
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Utilisateurs
        </h2>
        <p class="text-muted-foreground text-sm mt-0.5">
          En tant qu'admin, vous pouvez choisir et modifier le rôle de chaque employé ou directeur.
        </p>
      </div>
      <Button v-if="roleOptions.length > 0" @click="openCreateDialog">
        Créer un employé
      </Button>
    </div>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <p v-if="roleUpdateError" class="text-destructive text-sm">
      {{ roleUpdateError }}
    </p>
    <Card v-else>
      <CardContent class="p-0">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">
            Chargement…
          </p>
        </div>
        <template v-else>
          <Table v-if="users.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead v-if="roleOptions.length > 0" class="w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="u in users" :key="u.id">
                <TableCell class="font-medium">
                  {{ u.full_name }}
                </TableCell>
                <TableCell>{{ u.email }}</TableCell>
                <TableCell>{{ u.phone || '—' }}</TableCell>
                <TableCell>
                  <Select
                    v-if="canEditUser(u) && roleOptionsForUser(u).length > 0"
                    :model-value="(u.role as AppRole) ?? ''"
                    :disabled="updatingRoleFor === u.id"
                    @update:model-value="changeRole(u, $event as AppRole)"
                  >
                    <SelectTrigger class="w-[160px] h-8">
                      <SelectValue :placeholder="updatingRoleFor === u.id ? 'Enregistrement…' : 'Choisir un rôle'" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="r in roleOptionsForUser(u)" :key="r" :value="r">
                        {{ roleLabels[r] }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge v-else variant="secondary">
                    {{ roleLabels[u.role as string] ?? u.role ?? '—' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ new Date(u.created_at).toLocaleDateString('fr-FR') }}
                </TableCell>
                <TableCell v-if="canEditUser(u)" class="text-right">
                  <Button variant="ghost" size="sm" @click="openEditDialog(u)">
                    Modifier
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun utilisateur.
          </div>
        </template>
      </CardContent>
    </Card>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un compte employé</DialogTitle>
          <DialogDescription>
            L’employé pourra se connecter avec cet email et ce mot de passe. Le rôle définit ses accès.
          </DialogDescription>
        </DialogHeader>
        <form class="flex flex-col gap-4" @submit.prevent="createUser">
          <p v-if="createError" class="text-destructive text-sm">
            {{ createError }}
          </p>
          <div class="grid gap-2">
            <Label for="new_email">Email *</Label>
            <Input id="new_email" v-model="form.email" type="email" placeholder="employe@exemple.com" required />
          </div>
          <div class="grid gap-2">
            <Label for="new_password">Mot de passe * (min. 6 caractères)</Label>
            <Input id="new_password" v-model="form.password" type="password" placeholder="••••••••" required />
          </div>
          <div class="grid gap-2">
            <Label for="new_full_name">Nom complet *</Label>
            <Input id="new_full_name" v-model="form.full_name" placeholder="Prénom Nom" required />
          </div>
          <div class="grid gap-2">
            <Label for="new_phone">Téléphone</Label>
            <Input id="new_phone" v-model="form.phone" type="tel" placeholder="+221 77 123 45 67" />
          </div>
          <div class="grid gap-2">
            <Label for="new_role">Rôle *</Label>
            <Select v-model="form.role" required>
              <SelectTrigger id="new_role">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in roleOptions" :key="r" :value="r">
                  {{ roleLabels[r] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="createDialogOpen = false">
              Annuler
            </Button>
            <Button type="submit" :disabled="creating">
              {{ creating ? 'Création…' : 'Créer le compte' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="editDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'employé</DialogTitle>
        <DialogDescription>
          Modifier le nom, le téléphone, le rôle (employé ou directeur) ou le mot de passe. Laissez le mot de passe vide pour ne pas le changer.
        </DialogDescription>
        </DialogHeader>
        <form v-if="editUser" class="flex flex-col gap-4" @submit.prevent="saveEdit">
          <p v-if="editError" class="text-destructive text-sm">
            {{ editError }}
          </p>
          <div class="grid gap-2">
            <Label for="edit_full_name">Nom complet *</Label>
            <Input id="edit_full_name" v-model="editForm.full_name" placeholder="Prénom Nom" required />
          </div>
          <div class="grid gap-2">
            <Label for="edit_phone">Téléphone</Label>
            <Input id="edit_phone" v-model="editForm.phone" type="tel" placeholder="+221 77 123 45 67" />
          </div>
          <div class="grid gap-2">
            <Label for="edit_role">Rôle *</Label>
            <Select v-model="editForm.role" required>
              <SelectTrigger id="edit_role">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in editRoleOptions" :key="r" :value="r">
                  {{ roleLabels[r] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label for="edit_password">Nouveau mot de passe (optionnel)</Label>
            <Input id="edit_password" v-model="editForm.new_password" type="password" placeholder="Laisser vide pour ne pas changer" />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="editDialogOpen = false">
              Annuler
            </Button>
            <Button type="submit" :disabled="editing">
              {{ editing ? 'Enregistrement…' : 'Enregistrer' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
