<script setup lang="ts">
import type { Database } from '~/types/database'
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

type ClientRow = Database['public']['Tables']['clients']['Row']

const route = useRoute()
const router = useRouter()
const { user } = useAuthRole()
const clients = ref<ClientRow[]>([])
const loadingClients = ref(true)
const submitting = ref(false)
const error = ref('')

const form = ref({
  client_id: '',
  amount: 0,
  interest_rate: 10,
  duration_months: 12,
  purpose: '',
})

const totalAmount = computed(() => {
  const a = form.value.amount
  const r = form.value.interest_rate / 100
  const n = form.value.duration_months
  if (!a || !n)
    return 0
  return Math.round(a * (1 + r * (n / 12)) * 100) / 100
})

const monthlyPayment = computed(() => {
  const total = totalAmount.value
  const n = form.value.duration_months
  if (!n)
    return 0
  return Math.round((total / n) * 100) / 100
})

async function fetchClients() {
  loadingClients.value = true
  try {
    const supabase = useSupabase().value
    if (!supabase)
      return
    const { data, error: e } = await supabase
      .from('clients')
      .select('id, full_name, phone')
      .order('full_name')
    if (!e)
      clients.value = data ?? []
  }
  finally {
    loadingClients.value = false
  }
}

onMounted(() => {
  fetchClients()
  const prefillClient = route.query.client as string
  if (prefillClient)
    form.value.client_id = prefillClient
})

async function submit() {
  error.value = ''
  if (!form.value.client_id || !form.value.amount || form.value.amount <= 0) {
    error.value = 'Sélectionnez un client et indiquez un montant.'
    return
  }
  if (form.value.duration_months < 1) {
    error.value = 'La durée doit être d\'au moins 1 mois.'
    return
  }
  submitting.value = true
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('loans')
      .insert({
        client_id: form.value.client_id,
        amount: form.value.amount,
        interest_rate: form.value.interest_rate,
        duration_months: form.value.duration_months,
        purpose: form.value.purpose?.trim() || null,
        status: 'en_attente',
        total_amount: totalAmount.value,
        monthly_payment: monthlyPayment.value,
        created_by: user.value?.id ?? null,
      })
      .select('id')
      .single()
    if (e)
      throw e
    await router.push(`/loans/${data?.id ?? ''}`)
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur lors de la création du prêt.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" as-child>
        <NuxtLink to="/loans">
          <ArrowLeft class="size-4" />
        </NuxtLink>
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        Nouveau prêt
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>

    <Card class="max-w-xl">
      <CardHeader>
        <CardTitle>Informations du prêt</CardTitle>
        <CardDescription>
          Montant, taux et durée. Le total et la mensualité sont calculés automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="client_id">Client *</Label>
            <Select v-model="form.client_id" required>
              <SelectTrigger id="client_id">
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in clients"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.full_name }} — {{ c.phone }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="loadingClients" class="text-muted-foreground text-xs">
              Chargement des clients…
            </p>
          </div>
          <div class="grid gap-2">
            <Label for="amount">Montant (XOF) *</Label>
            <Input
              id="amount"
              v-model.number="form.amount"
              type="number"
              min="1"
              placeholder="0"
              required
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="interest_rate">Taux d'intérêt (%)</Label>
              <Input
                id="interest_rate"
                v-model.number="form.interest_rate"
                type="number"
                min="0"
                step="0.1"
              />
            </div>
            <div class="grid gap-2">
              <Label for="duration_months">Durée (mois)</Label>
              <Input
                id="duration_months"
                v-model.number="form.duration_months"
                type="number"
                min="1"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="purpose">Objet du prêt (optionnel)</Label>
            <Input id="purpose" v-model="form.purpose" placeholder="Ex. équipement, stock…" />
          </div>
          <div class="rounded-lg border bg-muted/50 p-3 text-sm">
            <p><strong>Total à rembourser :</strong> {{ totalAmount.toLocaleString('fr-FR') }} XOF</p>
            <p><strong>Mensualité :</strong> {{ monthlyPayment.toLocaleString('fr-FR') }} XOF</p>
          </div>
          <Button type="submit" :disabled="submitting">
            {{ submitting ? 'Création…' : 'Créer le prêt' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
