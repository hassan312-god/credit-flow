<script setup lang="ts">
definePageMeta({ layout: 'default' })

const supabase = useSupabase()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')

const form = ref({
  full_name: '',
  phone: '',
  email: '',
  avatar_url: '' as string | null,
})
const profileExists = ref(false)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)

const defaultAvatar = '/avatars/avatartion.png'
const displayAvatar = computed(() => avatarPreview.value || form.value.avatar_url || defaultAvatar)

function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  avatarFile.value = file ?? null
  avatarPreview.value = file ? URL.createObjectURL(file) : null
  input.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Non connecté. Connectez-vous pour modifier votre profil.'
      return
    }
    form.value.email = user.email ?? ''
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', user.id)
      .single()
    if (profile) {
      form.value.full_name = profile.full_name ?? ''
      form.value.phone = profile.phone ?? ''
      form.value.avatar_url = profile.avatar_url ?? null
      profileExists.value = true
    }
    else {
      const name = (user.user_metadata?.full_name as string) ?? ''
      form.value.full_name = name
      form.value.avatar_url = null
      profileExists.value = false
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement'
  }
  finally {
    loading.value = false
  }
}

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Non connecté.'
      return
    }

    let newAvatarUrl: string | null = null

    if (avatarFile.value) {
      const ext = avatarFile.value.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile.value, { upsert: true })
      if (uploadErr) {
        if (uploadErr.message?.toLowerCase().includes('bucket') || uploadErr.message?.toLowerCase().includes('not found')) {
          throw new Error('Bucket "avatars" introuvable. Créez-le dans Supabase : Storage → New bucket → nom "avatars", cocher Public.')
        }
        throw uploadErr
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = urlData.publicUrl
      avatarFile.value = null
      avatarPreview.value = null
    }

    const payload: { full_name: string | null; phone: string | null; avatar_url?: string | null } = {
      full_name: form.value.full_name.trim() || null,
      phone: form.value.phone.trim() || null,
    }
    if (newAvatarUrl !== null) payload.avatar_url = newAvatarUrl

    if (profileExists.value) {
      const { error: e } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
      if (e) throw e
    }
    else {
      const { error: e } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email ?? '',
          full_name: payload.full_name,
          phone: payload.phone,
          ...(payload.avatar_url !== undefined && { avatar_url: payload.avatar_url }),
        })
      if (e) throw e
      profileExists.value = true
    }
    if (newAvatarUrl !== null) form.value.avatar_url = newAvatarUrl
    await supabase.auth.updateUser({ data: { full_name: form.value.full_name.trim() || undefined } })
    const { refresh } = useAuthRole()
    await refresh()
    message.value = 'Profil enregistré.'
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur enregistrement'
    if (error.value.includes('Bucket') && !error.value.includes('Créez-le')) {
      error.value = 'Bucket "avatars" introuvable. Créez-le dans Supabase : Storage → New bucket → nom "avatars", cocher Public.'
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <SettingsLayout>
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Informations et photo de profil. Si vous ne choisissez pas de nouvelle photo, l'actuelle est conservée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="error" class="text-destructive text-sm mb-4">
          {{ error }}
        </p>
        <p v-if="message" class="text-green-600 text-sm mb-4">
          {{ message }}
        </p>
        <div v-if="loading" class="text-muted-foreground text-sm">
          Chargement…
        </div>
        <form v-else class="flex flex-col gap-4 max-w-md" @submit.prevent="save">
          <div class="grid gap-2">
            <Label>Photo de profil</Label>
            <div class="flex items-center gap-4">
              <Avatar class="h-20 w-20 rounded-lg">
                <AvatarImage :src="displayAvatar" alt="Photo de profil" class="object-cover" />
                <AvatarFallback class="rounded-lg text-lg">
                  {{ form.full_name?.slice(0, 2).toUpperCase() || '?' }}
                </AvatarFallback>
              </Avatar>
              <div class="flex flex-col gap-1">
                <Input
                  id="profile_avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="cursor-pointer text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                  @change="onAvatarChange"
                />
                <p class="text-muted-foreground text-xs">
                  JPG, PNG, WebP ou GIF. Max 2 Mo. Laisser vide pour garder la photo actuelle.
                </p>
              </div>
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="profile_email">Email</Label>
            <Input id="profile_email" :model-value="form.email" disabled class="bg-muted" />
            <p class="text-muted-foreground text-xs">L'email est géré par l'authentification.</p>
          </div>
          <div class="grid gap-2">
            <Label for="profile_full_name">Nom complet</Label>
            <Input id="profile_full_name" v-model="form.full_name" placeholder="Votre nom" />
          </div>
          <div class="grid gap-2">
            <Label for="profile_phone">Téléphone</Label>
            <Input id="profile_phone" v-model="form.phone" placeholder="+221 77 123 45 67" />
          </div>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </SettingsLayout>
</template>
