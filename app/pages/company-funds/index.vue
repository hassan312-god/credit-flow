<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { History, Wallet } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

interface Fund {
  id: string
  initial_capital: number
  current_balance: number
  total_loans_disbursed: number | null
  total_interest_earned: number | null
  total_payments_received: number | null
  notes: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

interface FundHistoryRow {
  id: string
  fund_id: string
  previous_balance: number
  new_balance: number
  change_amount: number
  change_type: string
  notes: string | null
  created_at: string
}

const changeTypeLabels: Record<string, string> = {
  initial_setup: 'Création / capital initial',
  adjustment: 'Ajustement',
  loan_disbursement: 'Déblocage prêt',
  payment_received: 'Paiement reçu',
  expense: 'Dépense',
}

const funds = ref<Fund[]>([])
const history = ref<FundHistoryRow[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const createForm = ref({ initial_capital: 0, notes: '' })
const adjustmentForm = ref({ amount: 0, notes: '' })
const updateForm = ref({ initial_capital: 0, notes: '' })

const { role } = useAuthRole()
const supabase = useSupabase().value
const canEdit = computed(() => role.value === 'directeur')

const mainFund = computed(() => funds.value[0] ?? null)

async function fetchFunds() {
  loading.value = true
  error.value = ''
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase.from('company_funds').select('*').order('created_at', { ascending: true })
    if (e)
      throw e
    funds.value = (data ?? []) as Fund[]
    if (funds.value.length > 0) {
      const fundId = funds.value[0].id
      const { data: histData, error: eH } = await supabase
        .from('company_funds_history')
        .select('id, fund_id, previous_balance, new_balance, change_amount, change_type, notes, created_at')
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!eH)
        history.value = (histData ?? []) as FundHistoryRow[]
      else history.value = []
    }
    else {
      history.value = []
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement fonds'
  }
  finally {
    loading.value = false
  }
}

async function createFund() {
  if (!canEdit.value || !supabase)
    return
  const cap = Number(createForm.value.initial_capital)
  if (Number.isNaN(cap) || cap < 0) {
    error.value = 'Le capital initial doit être un nombre positif.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: inserted, error: e } = await supabase
      .from('company_funds')
      .insert({
        initial_capital: cap,
        current_balance: cap,
        total_loans_disbursed: 0,
        total_interest_earned: 0,
        total_payments_received: 0,
        notes: createForm.value.notes?.trim() || null,
        updated_by: user?.id ?? null,
      })
      .select('id')
      .single()
    if (e)
      throw e
    const fundId = (inserted as { id: string }).id
    await supabase.from('company_funds_history').insert({
      fund_id: fundId,
      previous_balance: 0,
      new_balance: cap,
      change_amount: cap,
      change_type: 'initial_setup',
      notes: createForm.value.notes?.trim() || null,
      updated_by: user?.id ?? null,
    })
    createForm.value = { initial_capital: 0, notes: '' }
    await fetchFunds()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur création fonds'
  }
  finally {
    saving.value = false
  }
}

async function applyAdjustment() {
  const f = mainFund.value
  if (!canEdit.value || !supabase || !f)
    return
  const amount = Number(adjustmentForm.value.amount)
  if (Number.isNaN(amount) || amount === 0) {
    error.value = 'Indiquez un montant (positif pour ajouter, négatif pour retirer).'
    return
  }
  const newBalance = f.current_balance + amount
  if (newBalance < 0) {
    error.value = 'Le solde ne peut pas devenir négatif.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase
      .from('company_funds')
      .update({
        current_balance: newBalance,
        notes: updateForm.value.notes?.trim() || f.notes,
        updated_by: user?.id ?? null,
      })
      .eq('id', f.id)
    if (e)
      throw e
    await supabase.from('company_funds_history').insert({
      fund_id: f.id,
      previous_balance: f.current_balance,
      new_balance: newBalance,
      change_amount: amount,
      change_type: 'adjustment',
      notes: adjustmentForm.value.notes?.trim() || null,
      updated_by: user?.id ?? null,
    })
    adjustmentForm.value = { amount: 0, notes: '' }
    await fetchFunds()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur ajustement'
  }
  finally {
    saving.value = false
  }
}

async function updateFundDetails() {
  const f = mainFund.value
  if (!canEdit.value || !supabase || !f)
    return
  const cap = Number(updateForm.value.initial_capital)
  if (Number.isNaN(cap) || cap < 0) {
    error.value = 'Le capital initial doit être un nombre positif.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase
      .from('company_funds')
      .update({
        initial_capital: cap,
        notes: updateForm.value.notes?.trim() || null,
        updated_by: user?.id ?? null,
      })
      .eq('id', f.id)
    if (e)
      throw e
    await fetchFunds()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur mise à jour'
  }
  finally {
    saving.value = false
  }
}

function initUpdateForm() {
  const f = mainFund.value
  if (f) {
    updateForm.value = {
      initial_capital: f.initial_capital,
      notes: f.notes ?? '',
    }
  }
}

onMounted(() => fetchFunds())
watch(mainFund, (f) => {
  if (f)
    initUpdateForm()
}, { immediate: true })
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <h2 class="text-2xl font-bold tracking-tight">
      Fonds de trésorerie
    </h2>
    <p class="text-muted-foreground text-sm">
      Solde et indicateurs liés aux prêts (déblocages et paiements reçus). Le directeur peut créer le fonds, faire des ajustements et modifier les informations.
    </p>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>

    <template v-if="loading">
      <p class="text-muted-foreground">
        Chargement…
      </p>
    </template>
    <template v-else>
      <!-- Aucun fonds : création (directeur uniquement) -->
      <Card v-if="funds.length === 0">
        <CardHeader>
          <CardTitle class="text-base">
            Créer le fonds de trésorerie
          </CardTitle>
          <CardDescription>
            Aucun fonds enregistré. Définissez le capital initial pour commencer.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="canEdit">
          <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="createFund">
            <div class="grid gap-2">
              <Label for="init_cap">Capital initial (XOF) *</Label>
              <Input id="init_cap" v-model.number="createForm.initial_capital" type="number" min="0" step="1" required />
            </div>
            <div class="grid gap-2">
              <Label for="init_notes">Notes</Label>
              <Input id="init_notes" v-model="createForm.notes" placeholder="Optionnel" />
            </div>
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Création…' : 'Créer le fonds' }}
            </Button>
          </form>
        </CardContent>
        <p v-else class="text-muted-foreground text-sm">
          Seul le directeur peut créer le fonds. Contactez-le pour initialiser la trésorerie.
        </p>
      </Card>

      <template v-else>
        <!-- Vue d’ensemble -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card v-for="f in funds" :key="f.id">
            <CardHeader class="flex flex-row items-center justify-between pb-2">
              <CardTitle class="text-sm font-medium">
                Trésorerie
              </CardTitle>
              <Wallet class="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p class="text-2xl font-bold tabular-nums">
                <NumberFlow :value="f.current_balance" :format="{ style: 'currency', currency: 'XOF' }" />
              </p>
              <p class="text-muted-foreground text-xs mt-1">
                Capital initial : <NumberFlow :value="f.initial_capital" :format="{ style: 'currency', currency: 'XOF' }" />
              </p>
              <div class="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                <span>Prêts débloqués : <NumberFlow :value="f.total_loans_disbursed ?? 0" :format="{ style: 'currency', currency: 'XOF' }" /></span>
                <span>Intérêts perçus : <NumberFlow :value="f.total_interest_earned ?? 0" :format="{ style: 'currency', currency: 'XOF' }" /></span>
                <span>Paiements reçus : <NumberFlow :value="f.total_payments_received ?? 0" :format="{ style: 'currency', currency: 'XOF' }" /></span>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Modifier le fonds (directeur) -->
        <div v-if="canEdit && mainFund" class="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Ajustement du solde
              </CardTitle>
              <CardDescription>
                Ajouter (montant positif) ou retirer (montant négatif) de la trésorerie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form class="flex flex-col gap-4" @submit.prevent="applyAdjustment">
                <div class="grid gap-2">
                  <Label for="adj_amount">Montant (XOF) — positif = entrée, négatif = sortie</Label>
                  <Input id="adj_amount" v-model.number="adjustmentForm.amount" type="number" step="1" placeholder="0" />
                </div>
                <div class="grid gap-2">
                  <Label for="adj_notes">Motif / notes</Label>
                  <Input id="adj_notes" v-model="adjustmentForm.notes" placeholder="Optionnel" />
                </div>
                <Button type="submit" :disabled="saving">
                  {{ saving ? 'Enregistrement…' : 'Appliquer l’ajustement' }}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Modifier les informations
              </CardTitle>
              <CardDescription>
                Capital initial (affiché) et notes. N’affecte pas le solde actuel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form class="flex flex-col gap-4" @submit.prevent="updateFundDetails">
                <div class="grid gap-2">
                  <Label for="upd_cap">Capital initial (XOF)</Label>
                  <Input id="upd_cap" v-model.number="updateForm.initial_capital" type="number" min="0" step="1" />
                </div>
                <div class="grid gap-2">
                  <Label for="upd_notes">Notes</Label>
                  <Input id="upd_notes" v-model="updateForm.notes" placeholder="Optionnel" />
                </div>
                <Button type="submit" variant="outline" :disabled="saving">
                  {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <!-- Historique -->
        <Card v-if="mainFund">
          <CardHeader>
            <CardTitle class="text-base flex items-center gap-2">
              <History class="size-4" />
              Historique des mouvements
            </CardTitle>
            <CardDescription>
              Derniers mouvements du fonds (déblocages prêts, paiements, ajustements).
            </CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <Table v-if="history.length > 0">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Solde après</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="h in history" :key="h.id">
                  <TableCell class="text-muted-foreground text-sm">
                    {{ new Date(h.created_at).toLocaleString('fr-FR') }}
                  </TableCell>
                  <TableCell>{{ changeTypeLabels[h.change_type] ?? h.change_type }}</TableCell>
                  <TableCell class="tabular-nums">
                    <NumberFlow :value="h.change_amount" :format="{ style: 'currency', currency: 'XOF' }" />
                  </TableCell>
                  <TableCell class="tabular-nums">
                    <NumberFlow :value="h.new_balance" :format="{ style: 'currency', currency: 'XOF' }" />
                  </TableCell>
                  <TableCell class="text-muted-foreground text-sm">
                    {{ h.notes || '—' }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div v-else class="py-8 text-center text-muted-foreground text-sm">
              Aucun mouvement enregistré.
            </div>
          </CardContent>
        </Card>
      </template>
    </template>
  </div>
</template>
