<script setup lang="ts">
import type { LoanStatus } from '~/types/database'
import NumberFlow from '@number-flow/vue'
import { AlertTriangle, ArrowRight, HandCoins, Users } from 'lucide-vue-next'

definePageMeta({
  layout: 'default',
})

interface DashboardStats {
  totalClients: number
  totalLoans: number
  pendingLoans: number
  overdueLoans: number
  totalAmount: number
}

interface RecentLoan {
  id: string
  amount: number
  status: LoanStatus
  created_at: string
  client?: { full_name: string } | null
}

const stats = ref<DashboardStats>({
  totalClients: 0,
  totalLoans: 0,
  pendingLoans: 0,
  overdueLoans: 0,
  totalAmount: 0,
})
const recentLoans = ref<RecentLoan[]>([])
const loading = ref(true)
const error = ref('')

async function fetchDashboardData() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré. Ajoutez les variables d\'environnement.'
      return
    }

    const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true })
    const { data: loansData } = await supabase.from('loans').select('id, amount, status, total_amount')
    const { data: recent } = await supabase
      .from('loans')
      .select('id, amount, status, created_at, clients(full_name)')
      .order('created_at', { ascending: false })
      .limit(5)

    const pendingCount = loansData?.filter(l => l.status === 'en_attente').length ?? 0
    const overdueCount = loansData?.filter(l => l.status === 'en_retard' || l.status === 'defaut').length ?? 0
    const totalAmount = loansData?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) ?? 0

    stats.value = {
      totalClients: clientsCount ?? 0,
      totalLoans: loansData?.length ?? 0,
      pendingLoans: pendingCount,
      overdueLoans: overdueCount,
      totalAmount,
    }

    recentLoans.value = (recent ?? []).map((loan: any) => {
      const client = loan.clients ?? loan.client
      return {
        id: loan.id,
        amount: loan.amount,
        status: loan.status,
        created_at: loan.created_at,
        client: Array.isArray(client) ? client[0] : client,
      }
    })
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur lors du chargement des données.'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

function statusLabel(s: LoanStatus) {
  const labels: Record<LoanStatus, string> = {
    en_attente: 'En attente',
    valide: 'Validé',
    en_cours: 'En cours',
    rembourse: 'Remboursé',
    en_retard: 'En retard',
    defaut: 'Défaut',
  }
  return labels[s] || s
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Tableau de bord
      </h2>
    </div>

    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>

    <main v-else class="@container/main flex flex-1 flex-col gap-4 md:gap-8">
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card v-for="i in 4" :key="i" class="animate-pulse">
          <CardHeader>
            <div class="h-4 w-24 rounded bg-muted" />
            <div class="h-8 w-32 rounded bg-muted" />
          </CardHeader>
        </Card>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card class="@container/card">
          <CardHeader>
            <CardDescription>Clients</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow :value="stats.totalClients" />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Users class="size-3" />
                Total
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm text-muted-foreground">
            Nombre total de clients
          </CardFooter>
        </Card>

        <Card class="@container/card">
          <CardHeader>
            <CardDescription>Prêts</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow :value="stats.totalLoans" />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <HandCoins class="size-3" />
                Total
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm text-muted-foreground">
            Dont {{ stats.pendingLoans }} en attente
          </CardFooter>
        </Card>

        <Card class="@container/card">
          <CardHeader>
            <CardDescription>En attente</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow :value="stats.pendingLoans" />
            </CardTitle>
            <CardAction>
              <Badge variant="secondary">
                Prêts
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm text-muted-foreground">
            Validation en attente
          </CardFooter>
        </Card>

        <Card class="@container/card">
          <CardHeader>
            <CardDescription>En retard / Défaut</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-destructive">
              <NumberFlow :value="stats.overdueLoans" />
            </CardTitle>
            <CardAction>
              <Badge variant="destructive">
                <AlertTriangle class="size-3" />
                Alertes
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm text-muted-foreground">
            Recouvrement
          </CardFooter>
        </Card>
      </div>

      <Card class="@container/card">
        <CardHeader>
          <CardTitle>Montant total des prêts</CardTitle>
          <CardDescription>
            Somme des montants débloqués
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-3xl font-bold tabular-nums">
            <NumberFlow
              :value="stats.totalAmount"
              :format="{ style: 'currency', currency: 'XOF', trailingZeroDisplay: 'stripIfInteger' }"
            />
          </p>
        </CardContent>
      </Card>

      <Card class="@container/card">
        <CardHeader>
          <CardTitle>Prêts récents</CardTitle>
          <CardDescription>
            Derniers prêts enregistrés
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" as-child>
              <NuxtLink to="/loans">
                Voir tout
                <ArrowRight class="ml-2 size-4" />
              </NuxtLink>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div v-if="recentLoans.length === 0" class="text-muted-foreground py-8 text-center text-sm">
            Aucun prêt pour le moment
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="loan in recentLoans"
              :key="loan.id"
              class="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div>
                <p class="font-medium">
                  {{ (loan.client as any)?.full_name ?? '—' }}
                </p>
                <p class="text-muted-foreground text-sm">
                  {{ new Date(loan.created_at).toLocaleDateString('fr-FR') }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold tabular-nums">
                  <NumberFlow :value="loan.amount" :format="{ style: 'currency', currency: 'XOF' }" />
                </p>
                <Badge variant="outline" class="text-xs">
                  {{ statusLabel(loan.status) }}
                </Badge>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
