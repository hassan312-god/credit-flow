<script setup lang="ts">
import type { Database, LoanStatus } from '~/types/database'
import NumberFlow from '@number-flow/vue'
import { ArrowLeft, Briefcase, CreditCard, Mail, MapPin, Phone, Trash2 } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const route = useRoute()
const clientId = computed(() => route.params.id as string)

type ClientRow = Database['public']['Tables']['clients']['Row']

interface LoanRow {
  id: string
  amount: number
  interest_rate: number
  duration_months: number
  status: LoanStatus
  total_amount: number | null
  monthly_payment: number | null
  disbursement_date: string | null
  created_at: string
}

interface PaymentRow {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  payment_method: string
  created_at: string
}

const client = ref<ClientRow | null>(null)
const loans = ref<LoanRow[]>([])
const payments = ref<PaymentRow[]>([])
const loading = ref(true)
const error = ref('')
const deleteDialogOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

const { role } = useAuthRole()
const canDeleteClient = computed(() => role.value === 'directeur' || role.value === 'admin')

const statusLabels: Record<LoanStatus, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  en_cours: 'En cours',
  rembourse: 'Remboursé',
  en_retard: 'En retard',
  defaut: 'Défaut',
}

async function fetchData() {
  loading.value = true
  error.value = ''
  const id = clientId.value
  if (!id) {
    error.value = 'Client introuvable.'
    loading.value = false
    return
  }
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data: clientData, error: eClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    if (eClient)
      throw eClient
    client.value = clientData

    const { data: loansData, error: eLoans } = await supabase
      .from('loans')
      .select('id, amount, interest_rate, duration_months, status, total_amount, monthly_payment, disbursement_date, created_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    if (eLoans)
      throw eLoans
    loans.value = loansData ?? []

    const loanIds = loans.value.map(l => l.id)
    if (loanIds.length > 0) {
      const { data: paymentsData, error: ePay } = await supabase
        .from('payments')
        .select('id, loan_id, amount, payment_date, payment_method, created_at')
        .in('loan_id', loanIds)
        .order('payment_date', { ascending: false })
        .limit(50)
      if (!ePay)
        payments.value = paymentsData ?? []
    }
    else {
      payments.value = []
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement'
  }
  finally {
    loading.value = false
  }
}

async function deleteClient() {
  const id = clientId.value
  const supabase = useSupabase().value
  if (!id || !supabase)
    return
  deleting.value = true
  deleteError.value = ''
  try {
    const { error: e } = await supabase.from('clients').delete().eq('id', id)
    if (e)
      throw e
    deleteDialogOpen.value = false
    await navigateTo('/clients', { replace: true })
  }
  catch (e: any) {
    const msg = e?.message || ''
    deleteError.value = msg.includes('policy') || msg.includes('row-level security')
      ? 'Seul le directeur peut supprimer un client.'
      : (msg || 'Erreur lors de la suppression')
  }
  finally {
    deleting.value = false
  }
}

onMounted(() => fetchData())
watch(clientId, () => fetchData())
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
        Détail client
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="loading">
      <p class="text-muted-foreground">
        Chargement…
      </p>
    </template>
    <template v-else-if="client">
      <Card>
        <CardHeader class="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{{ client.full_name }}</CardTitle>
            <CardDescription>
              Client créé le {{ new Date(client.created_at).toLocaleDateString('fr-FR') }}
            </CardDescription>
          </div>
          <Button
            v-if="canDeleteClient"
            variant="destructive"
            size="sm"
            class="shrink-0"
            @click="deleteDialogOpen = true"
          >
            <Trash2 class="size-4 mr-1" />
            Supprimer le client
          </Button>
        </CardHeader>
        <CardContent class="flex flex-col gap-3 text-sm">
          <div class="flex flex-wrap gap-4">
            <span v-if="client.phone" class="flex items-center gap-1.5">
              <Phone class="size-4 text-muted-foreground" />
              {{ client.phone }}
            </span>
            <span v-if="client.email" class="flex items-center gap-1.5">
              <Mail class="size-4 text-muted-foreground" />
              {{ client.email }}
            </span>
          </div>
          <div class="flex flex-wrap gap-4">
            <span class="flex items-center gap-1.5">
              <CreditCard class="size-4 text-muted-foreground" />
              {{ client.id_type }} {{ client.id_number }}
            </span>
            <span v-if="client.address" class="flex items-center gap-1.5">
              <MapPin class="size-4 text-muted-foreground" />
              {{ client.address }}
            </span>
            <span v-if="client.profession" class="flex items-center gap-1.5">
              <Briefcase class="size-4 text-muted-foreground" />
              {{ client.profession }}
            </span>
          </div>
          <div v-if="client.monthly_income != null" class="text-muted-foreground">
            Revenu mensuel : <NumberFlow :value="client.monthly_income" :format="{ style: 'currency', currency: 'XOF' }" />
          </div>
        </CardContent>
      </Card>

      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Prêts
        </h3>
        <Button as-child size="sm">
          <NuxtLink :to="`/loans/new?client=${client.id}`">
            Nouveau prêt
          </NuxtLink>
        </Button>
      </div>
      <Card>
        <CardContent class="p-0">
          <Table v-if="loans.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Montant</TableHead>
                <TableHead>Taux / Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Déblocage</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="loan in loans" :key="loan.id">
                <TableCell class="tabular-nums">
                  <NumberFlow :value="loan.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </TableCell>
                <TableCell>{{ loan.interest_rate }}% / {{ loan.duration_months }} mois</TableCell>
                <TableCell>
                  <Badge
                    :variant="loan.status === 'en_retard' || loan.status === 'defaut' ? 'destructive' : 'secondary'"
                  >
                    {{ statusLabels[loan.status] }}
                  </Badge>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ loan.disbursement_date ? new Date(loan.disbursement_date).toLocaleDateString('fr-FR') : '—' }}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" as-child>
                    <NuxtLink :to="`/loans/${loan.id}`">
                      Voir
                    </NuxtLink>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-muted-foreground text-sm">
            Aucun prêt pour ce client.
          </div>
        </CardContent>
      </Card>

      <h3 class="text-lg font-semibold">
        Derniers paiements
      </h3>
      <Card>
        <CardContent class="p-0">
          <Table v-if="payments.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
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
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-muted-foreground text-sm">
            Aucun paiement.
          </div>
        </CardContent>
      </Card>

      <AlertDialog v-model:open="deleteDialogOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les prêts associés à ce client seront également supprimés. Souhaitez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p v-if="deleteError" class="text-destructive text-sm">
            {{ deleteError }}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="deleting">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              :disabled="deleting"
              @click="deleteClient"
            >
              {{ deleting ? 'Suppression…' : 'Supprimer' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>
    <p v-else class="text-muted-foreground">
      Client introuvable.
    </p>
  </div>
</template>
