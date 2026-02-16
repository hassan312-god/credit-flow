<script setup lang="ts">
import type { LoanStatus } from '~/types/database'
import NumberFlow from '@number-flow/vue'
import { AlertTriangle } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

interface LoanWithClient {
  id: string
  client_id: string
  amount: number
  status: LoanStatus
  total_amount: number | null
  created_at: string
  disbursement_date: string | null
  clients?: { full_name: string, phone: string } | null
}

const loans = ref<LoanWithClient[]>([])
const loading = ref(true)
const error = ref('')

async function fetchRecovery() {
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
      .select('id, client_id, amount, status, total_amount, created_at, disbursement_date, clients(full_name, phone)')
      .in('status', ['en_retard', 'defaut'])
      .order('created_at', { ascending: false })
    if (e)
      throw e
    loans.value = (data ?? []).map((row: any) => ({
      ...row,
      clients: Array.isArray(row.clients) ? row.clients[0] : row.clients,
    }))
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement recouvrement'
  }
  finally {
    loading.value = false
  }
}

function clientName(loan: LoanWithClient) {
  const c = loan.clients
  return (c && typeof c === 'object' && 'full_name' in c) ? (c as { full_name: string }).full_name : '—'
}

function clientPhone(loan: LoanWithClient) {
  const c = loan.clients
  return (c && typeof c === 'object' && 'phone' in c) ? (c as { phone: string }).phone : '—'
}

onMounted(() => fetchRecovery())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Recouvrement
      </h2>
      <Badge variant="destructive" class="gap-1">
        <AlertTriangle class="size-3.5" />
        Prêts en retard ou en défaut
      </Badge>
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
                <TableHead>Téléphone</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date déblocage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="loan in loans" :key="loan.id">
                <TableCell class="font-medium">
                  {{ clientName(loan) }}
                </TableCell>
                <TableCell class="text-sm">
                  {{ clientPhone(loan) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  <NumberFlow :value="loan.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {{ loan.status === 'defaut' ? 'Défaut' : 'En retard' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ loan.disbursement_date ? new Date(loan.disbursement_date).toLocaleDateString('fr-FR') : '—' }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun prêt en recouvrement.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
