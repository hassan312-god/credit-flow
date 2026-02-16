<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const form = ref({
  full_name: '',
  phone: '',
  email: '',
  id_type: 'CNI',
  id_number: '',
  address: '',
  profession: '',
  monthly_income: '' as string | number,
})
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function submit() {
  error.value = ''
  if (!form.value.full_name.trim() || !form.value.phone.trim() || !form.value.id_number.trim()) {
    error.value = 'Nom, téléphone et numéro de pièce sont obligatoires.'
    return
  }
  loading.value = true
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { error: e } = await supabase.from('clients').insert({
      full_name: form.value.full_name.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email?.trim() || null,
      id_type: form.value.id_type,
      id_number: form.value.id_number.trim(),
      address: form.value.address?.trim() || null,
      profession: form.value.profession?.trim() || null,
      monthly_income: form.value.monthly_income === '' ? null : Number(form.value.monthly_income),
    })
    if (e)
      throw e
    success.value = true
    form.value = { full_name: '', phone: '', email: '', id_type: 'CNI', id_number: '', address: '', profession: '', monthly_income: '' }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur lors de la création'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" as-child>
        <NuxtLink to="/clients">
          <ArrowLeft class="size-4" />
        </NuxtLink>
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        Nouveau client
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <p v-if="success" class="text-green-600 text-sm">
      Client créé. <NuxtLink to="/clients" class="underline">
        Voir la liste
      </NuxtLink>
    </p>

    <Card class="max-w-xl">
      <CardHeader>
        <CardTitle>Informations client</CardTitle>
        <CardDescription>
          Renseignez les champs obligatoires (nom, téléphone, pièce d'identité).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="full_name">Nom complet *</Label>
            <Input id="full_name" v-model="form.full_name" placeholder="Nom complet" required />
          </div>
          <div class="grid gap-2">
            <Label for="phone">Téléphone *</Label>
            <Input id="phone" v-model="form.phone" placeholder="+221 77 123 45 67" required />
          </div>
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="form.email" type="email" placeholder="email@exemple.com" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="id_type">Type de pièce *</Label>
              <Select v-model="form.id_type">
                <SelectTrigger id="id_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNI">
                    CNI
                  </SelectItem>
                  <SelectItem value="Passeport">
                    Passeport
                  </SelectItem>
                  <SelectItem value="Permis">
                    Permis
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="id_number">Numéro de pièce *</Label>
              <Input id="id_number" v-model="form.id_number" placeholder="Numéro" required />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="address">Adresse</Label>
            <Input id="address" v-model="form.address" placeholder="Adresse" />
          </div>
          <div class="grid gap-2">
            <Label for="profession">Profession</Label>
            <Input id="profession" v-model="form.profession" placeholder="Profession" />
          </div>
          <div class="grid gap-2">
            <Label for="monthly_income">Revenu mensuel (optionnel)</Label>
            <Input id="monthly_income" v-model="form.monthly_income" type="number" min="0" placeholder="0" />
          </div>
          <Button type="submit" :disabled="loading">
            {{ loading ? 'Création…' : 'Créer le client' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
