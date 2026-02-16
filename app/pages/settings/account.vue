<script setup lang="ts">
definePageMeta({ layout: 'default' })

const supabase = useSupabase()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')
const email = ref('')
const form = ref({
  newPassword: '',
  confirmPassword: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) email.value = user.email ?? ''
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement'
  }
  finally {
    loading.value = false
  }
}

async function changePassword() {
  error.value = ''
  message.value = ''
  if (form.value.newPassword.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  saving.value = true
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { error: e } = await supabase.auth.updateUser({ password: form.value.newPassword })
    if (e) throw e
    message.value = 'Mot de passe mis à jour.'
    form.value.newPassword = ''
    form.value.confirmPassword = ''
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur mise à jour'
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
        <CardTitle>Compte</CardTitle>
        <CardDescription>
          Email de connexion et mot de passe (Supabase Auth).
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-6">
        <p v-if="error" class="text-destructive text-sm">
          {{ error }}
        </p>
        <p v-if="message" class="text-green-600 text-sm">
          {{ message }}
        </p>
        <div v-if="loading" class="text-muted-foreground text-sm">
          Chargement…
        </div>
        <template v-else>
          <div class="grid gap-2 max-w-md">
            <Label>Email de connexion</Label>
            <Input :model-value="email" disabled class="bg-muted" />
            <p class="text-muted-foreground text-xs">
              Pour modifier l'email, utilisez la réinitialisation ou contactez l'administrateur.
            </p>
          </div>
          <Separator />
          <div class="max-w-md">
            <h4 class="text-sm font-medium mb-2">Changer le mot de passe</h4>
            <form class="flex flex-col gap-4" @submit.prevent="changePassword">
              <div class="grid gap-2">
                <Label for="new_password">Nouveau mot de passe</Label>
                <Input
                  id="new_password"
                  v-model="form.newPassword"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
              </div>
              <div class="grid gap-2">
                <Label for="confirm_password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm_password"
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
              </div>
              <Button type="submit" :disabled="saving">
                {{ saving ? 'Mise à jour…' : 'Mettre à jour le mot de passe' }}
              </Button>
            </form>
          </div>
        </template>
      </CardContent>
    </Card>
  </SettingsLayout>
</template>
