<script setup lang="ts">
import NumberFlow from '@number-flow/vue'

definePageMeta({ layout: 'default' })

interface PaymentWithLoan {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  created_at: string
  loans?: { clients?: { full_name?: string } | { full_name: string }[] } | null
}

const payments = ref<PaymentWithLoan[]>([])
const loading = ref(true)
const error = ref('')

async function fetchPayments() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('payments')
      .select(`
        id, loan_id, amount, payment_date, payment_method, notes, created_at,
        loans(clients(full_name))
      `)
      .order('payment_date', { ascending: false })
      .limit(200)
    if (e) throw e
    payments.value = (data ?? []) as PaymentWithLoan[]
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement paiements'
  }
  finally {
    loading.value = false
  }
}

function clientName(p: PaymentWithLoan) {
  const loan = p.loans
  if (!loan) return '—'
  const clients = Array.isArray(loan.clients) ? loan.clients[0] : loan.clients
  return (clients as any)?.full_name ?? '—'
}

onMounted(() => fetchPayments())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Paiements
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>

    <Card v-else>
      <CardContent class="p-0">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <p class="text-muted-foreground">Chargement…</p>
        </div>
        <template v-else>
          <Table v-if="payments.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Client (prêt)</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="p in payments" :key="p.id">
                <TableCell class="font-medium">
                  {{ clientName(p) }}
                </TableCell>
                <TableCell class="tabular-nums">
                  <NumberFlow :value="p.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </TableCell>
                <TableCell class="text-sm">
                  {{ new Date(p.payment_date).toLocaleDateString('fr-FR') }}
                </TableCell>
                <TableCell>
                  {{ p.payment_method }}
                </TableCell>
                <TableCell class="max-w-32 truncate text-muted-foreground text-sm">
                  {{ p.notes || '—' }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun paiement.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
