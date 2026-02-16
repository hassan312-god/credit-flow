<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { FileBarChart, TrendingUp, Wallet, HandCoins } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const loading = ref(true)
const error = ref('')
const stats = ref({
  totalLoans: 0,
  totalAmountLoans: 0,
  totalPayments: 0,
  totalAmountPayments: 0,
  clientsCount: 0,
})

async function fetchReports() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const [clientsRes, loansRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('loans').select('id, amount'),
      supabase.from('payments').select('amount'),
    ])
    const loans = loansRes.data ?? []
    const payments = paymentsRes.data ?? []
    stats.value = {
      clientsCount: clientsRes.count ?? 0,
      totalLoans: loans.length,
      totalAmountLoans: loans.reduce((s, l) => s + (Number(l.amount) || 0), 0),
      totalPayments: payments.length,
      totalAmountPayments: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement rapports'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchReports())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <h2 class="text-2xl font-bold tracking-tight">
      Rapports
    </h2>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <div v-else-if="loading" class="py-12 text-center text-muted-foreground">
      Chargement…
    </div>
    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium">Clients</CardTitle>
            <FileBarChart class="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold">
              <NumberFlow :value="stats.clientsCount" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium">Prêts (nombre)</CardTitle>
            <HandCoins class="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold">
              <NumberFlow :value="stats.totalLoans" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium">Montant prêté</CardTitle>
            <TrendingUp class="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold tabular-nums">
              <NumberFlow :value="stats.totalAmountLoans" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium">Paiements reçus</CardTitle>
            <Wallet class="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold tabular-nums">
              <NumberFlow :value="stats.totalAmountPayments" :format="{ style: 'currency', currency: 'XOF' }" />
            </p>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
