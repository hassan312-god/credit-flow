<script setup lang="ts">
import type { LoanStatus } from '~/types/database'
import NumberFlow from '@number-flow/vue'
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const route = useRoute()
const loanId = computed(() => route.params.id as string)

interface LoanWithClient {
  id: string
  client_id: string
  amount: number
  interest_rate: number
  duration_months: number
  status: LoanStatus
  total_amount: number | null
  monthly_payment: number | null
  purpose: string | null
  disbursement_date: string | null
  validation_date: string | null
  created_at: string
  clients?: { full_name: string } | null
}

interface PaymentRow {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  created_at: string
}

const loan = ref<LoanWithClient | null>(null)
const payments = ref<PaymentRow[]>([])
const loading = ref(true)
const error = ref('')
const paymentForm = ref({ amount: 0, payment_date: '', payment_method: 'especes', notes: '' })
const addingPayment = ref(false)
const closingLoan = ref(false)
const disbursingLoan = ref(false)

const statusLabels: Record<LoanStatus, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  en_cours: 'En cours',
  rembourse: 'Remboursé',
  en_retard: 'En retard',
  defaut: 'Défaut',
}

const totalPaid = computed(() => payments.value.reduce((s, p) => s + p.amount, 0))
const remaining = computed(() => {
  const l = loan.value
  if (!l?.total_amount) return null
  return Math.max(0, l.total_amount - totalPaid.value)
})

async function fetchData() {
  loading.value = true
  error.value = ''
  const id = loanId.value
  if (!id) {
    error.value = 'Prêt introuvable.'
    loading.value = false
    return
  }
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: loanData, error: eLoan } = await supabase
      .from('loans')
      .select('id, client_id, amount, interest_rate, duration_months, status, total_amount, monthly_payment, purpose, disbursement_date, validation_date, created_at, clients(full_name)')
      .eq('id', id)
      .single()
    if (eLoan) throw eLoan
    loan.value = {
      ...loanData,
      clients: Array.isArray((loanData as any)?.clients) ? (loanData as any).clients[0] : (loanData as any)?.clients,
    }

    const { data: payData, error: ePay } = await supabase
      .from('payments')
      .select('id, amount, payment_date, payment_method, notes, created_at')
      .eq('loan_id', id)
      .order('payment_date', { ascending: false })
    if (!ePay) payments.value = payData ?? []
    else payments.value = []
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement'
  }
  finally {
    loading.value = false
  }
}

function clientName() {
  const c = loan.value?.clients
  return (c && typeof c === 'object' && 'full_name' in c) ? (c as { full_name: string }).full_name : '—'
}

async function addPayment() {
  const id = loanId.value
  if (!id || !loan.value || paymentForm.value.amount <= 0) return
  addingPayment.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) throw new Error('Supabase non configuré.')
    const date = paymentForm.value.payment_date || new Date().toISOString().slice(0, 10)
    const { user } = useAuthRole()
    const { error: e } = await supabase.from('payments').insert({
      loan_id: id,
      amount: paymentForm.value.amount,
      payment_date: date,
      payment_method: paymentForm.value.payment_method,
      notes: paymentForm.value.notes?.trim() || null,
      recorded_by: user.value?.id ?? null,
    })
    if (e) throw e
    paymentForm.value = { amount: 0, payment_date: '', payment_method: 'especes', notes: '' }
    await fetchData()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur enregistrement paiement'
  }
  finally {
    addingPayment.value = false
  }
}

async function disburseLoan() {
  const id = loanId.value
  if (!id || !loan.value) return
  disbursingLoan.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) throw new Error('Supabase non configuré.')
    const today = new Date().toISOString().slice(0, 10)
    const { error: e } = await supabase.from('loans').update({
      status: 'en_cours',
      disbursement_date: today,
    }).eq('id', id)
    if (e) throw e
    await fetchData()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur déblocage prêt'
  }
  finally {
    disbursingLoan.value = false
  }
}

async function closeLoan() {
  const id = loanId.value
  if (!id || !loan.value) return
  closingLoan.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) throw new Error('Supabase non configuré.')
    const { error: e } = await supabase.from('loans').update({ status: 'rembourse' }).eq('id', id)
    if (e) throw e
    await fetchData()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur clôture prêt'
  }
  finally {
    closingLoan.value = false
  }
}

onMounted(() => {
  paymentForm.value.payment_date = new Date().toISOString().slice(0, 10)
  fetchData()
})
watch(loanId, () => fetchData())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" as-child>
        <NuxtLink to="/loans"><ArrowLeft class="size-4" /></NuxtLink>
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        Détail du prêt
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="loading">
      <p class="text-muted-foreground">Chargement…</p>
    </template>
    <template v-else-if="loan">
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prêt</CardTitle>
            <CardDescription>
              Créé le {{ new Date(loan.created_at).toLocaleDateString('fr-FR') }}
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-2 text-sm">
            <p>
              <strong>Client :</strong>
              <NuxtLink :to="`/clients/${loan.client_id}`" class="text-primary underline ml-1">
                {{ clientName() }}
              </NuxtLink>
            </p>
            <p>
              <strong>Montant :</strong>
              <NumberFlow :value="loan.amount" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
            <p>
              <strong>Taux :</strong> {{ loan.interest_rate }}% — <strong>Durée :</strong> {{ loan.duration_months }} mois
            </p>
            <p v-if="loan.total_amount != null">
              <strong>Total à rembourser :</strong>
              <NumberFlow :value="loan.total_amount" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
            <p v-if="loan.monthly_payment != null">
              <strong>Mensualité :</strong>
              <NumberFlow :value="loan.monthly_payment" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
            <p v-if="loan.purpose">
              <strong>Objet :</strong> {{ loan.purpose }}
            </p>
            <p>
              <strong>Statut :</strong>
              <Badge
                :variant="loan.status === 'en_retard' || loan.status === 'defaut' ? 'destructive' : 'secondary'"
              >
                {{ statusLabels[loan.status] }}
              </Badge>
            </p>
            <p v-if="loan.disbursement_date">
              <strong>Déblocage :</strong> {{ new Date(loan.disbursement_date).toLocaleDateString('fr-FR') }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remboursement</CardTitle>
            <CardDescription>
              Paiements reçus
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-2 text-sm">
            <p>
              <strong>Payé :</strong>
              <NumberFlow :value="totalPaid" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
            <p v-if="remaining != null">
              <strong>Reste :</strong>
              <NumberFlow :value="remaining" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
        <Card class="flex-1">
          <CardHeader>
            <CardTitle class="text-base">Enregistrer un paiement</CardTitle>
            <CardDescription>Quand un client paie, enregistrez le montant ici.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-wrap items-end gap-3">
            <div class="grid gap-1.5">
              <Label for="pay_amount">Montant (XOF)</Label>
              <Input id="pay_amount" v-model.number="paymentForm.amount" type="number" min="1" class="w-32" />
            </div>
            <div class="grid gap-1.5">
              <Label for="pay_date">Date</Label>
              <Input id="pay_date" v-model="paymentForm.payment_date" type="date" class="w-40" />
            </div>
            <div class="grid gap-1.5">
              <Label for="pay_method">Méthode</Label>
              <Select v-model="paymentForm.payment_method">
                <SelectTrigger id="pay_method" class="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="mobile_money">Mobile money</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-1.5 flex-1 min-w-[200px]">
              <Label for="pay_notes">Notes</Label>
              <Input id="pay_notes" v-model="paymentForm.notes" placeholder="Optionnel" />
            </div>
            <Button :disabled="addingPayment || paymentForm.amount <= 0" @click="addPayment">
              {{ addingPayment ? 'Enregistrement…' : 'Enregistrer le paiement' }}
            </Button>
          </CardContent>
        </Card>
        <Card v-if="!loan.disbursement_date && loan.status !== 'rembourse'" class="sm:w-auto">
          <CardHeader>
            <CardTitle class="text-base">Débloquer le prêt</CardTitle>
            <CardDescription>Enregistrer la sortie de trésorerie (montant prêté au client).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" :disabled="disbursingLoan" @click="disburseLoan">
              {{ disbursingLoan ? 'En cours…' : 'Débloquer le prêt' }}
            </Button>
          </CardContent>
        </Card>
        <Card v-if="loan.status !== 'rembourse' && loan.disbursement_date" class="sm:w-auto">
          <CardHeader>
            <CardTitle class="text-base">Clôturer le prêt</CardTitle>
            <CardDescription>Marquer comme entièrement remboursé.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" :disabled="closingLoan" @click="closeLoan">
              {{ closingLoan ? 'En cours…' : 'Marquer remboursé' }}
            </Button>
          </CardContent>
        </Card>
      </div>

      <h3 class="text-lg font-semibold">Paiements</h3>
      <Card>
        <CardContent class="p-0">
          <Table v-if="payments.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="p in payments" :key="p.id">
                <TableCell class="text-muted-foreground text-sm">
                  {{ new Date(p.payment_date).toLocaleDateString('fr-FR') }}
                </TableCell>
                <TableCell class="tabular-nums">
                  <NumberFlow :value="p.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </TableCell>
                <TableCell>{{ p.payment_method }}</TableCell>
                <TableCell class="text-muted-foreground text-sm">{{ p.notes || '—' }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-muted-foreground text-sm">
            Aucun paiement enregistré pour ce prêt.
          </div>
        </CardContent>
      </Card>
    </template>
    <p v-else class="text-muted-foreground">
      Prêt introuvable.
    </p>
  </div>
</template>
