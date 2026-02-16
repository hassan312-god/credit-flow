<script setup lang="ts">
import type { LoanStatus } from '~/types/database'
import NumberFlow from '@number-flow/vue'

definePageMeta({ layout: 'default' })

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
  created_at: string
  clients?: { full_name: string } | null
}

const loans = ref<LoanWithClient[]>([])
const loading = ref(true)
const error = ref('')

const statusLabels: Record<LoanStatus, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  en_cours: 'En cours',
  rembourse: 'Remboursé',
  en_retard: 'En retard',
  defaut: 'Défaut',
}

async function fetchLoans() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('loans')
      .select('id, client_id, amount, interest_rate, duration_months, status, total_amount, monthly_payment, purpose, disbursement_date, created_at, clients(full_name)')
      .order('created_at', { ascending: false })
    if (e)
      throw e
    loans.value = (data ?? []).map((row: any) => ({
      ...row,
      clients: Array.isArray(row.clients) ? row.clients[0] : row.clients,
    }))
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement prêts'
  }
  finally {
    loading.value = false
  }
}

function clientName(loan: LoanWithClient) {
  const c = loan.clients
  return (c && typeof c === 'object' && 'full_name' in c) ? (c as { full_name: string }).full_name : '—'
}

onMounted(() => fetchLoans())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Prêts
      </h2>
      <Button as-child>
        <NuxtLink to="/loans/new">
          Nouveau prêt
        </NuxtLink>
      </Button>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>

    <Card v-else>
      <CardContent class="p-0">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">
            Chargement…
          </p>
        </div>
        <template v-else>
          <Table v-if="loans.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Taux / Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date déblocage</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="loan in loans" :key="loan.id">
                <TableCell class="font-medium">
                  <NuxtLink :to="`/clients/${loan.client_id}`" class="hover:underline">
                    {{ clientName(loan) }}
                  </NuxtLink>
                </TableCell>
                <TableCell class="tabular-nums">
                  <NumberFlow :value="loan.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </TableCell>
                <TableCell>
                  {{ loan.interest_rate }}% / {{ loan.duration_months }} mois
                </TableCell>
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
                <TableCell class="text-muted-foreground text-sm">
                  {{ new Date(loan.created_at).toLocaleDateString('fr-FR') }}
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
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun prêt.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
