<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface WorkSession {
  work_date: string
  status: string
}

const loading = ref(true)
const error = ref('')
const totalSessions = ref(0)
const byDate = ref<{ date: string, count: number }[]>([])

async function fetchReport() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('work_sessions')
      .select('work_date, status')
      .order('work_date', { ascending: false })
      .limit(500)
    if (e)
      throw e
    const rows = (data ?? []) as WorkSession[]
    totalSessions.value = rows.length
    const byDateMap = new Map<string, number>()
    for (const r of rows) {
      const d = r.work_date
      byDateMap.set(d, (byDateMap.get(d) ?? 0) + 1)
    }
    byDate.value = Array.from(byDateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement rapport'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchReport())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <h2 class="text-2xl font-bold tracking-tight">
      Rapports de présence
    </h2>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="loading">
      <p class="text-muted-foreground">
        Chargement…
      </p>
    </template>
    <template v-else>
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle class="text-sm font-medium">
              Total sessions (dernières 500)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold">
              {{ totalSessions }}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sessions par date</CardTitle>
          <CardDescription>Nombre de sessions de travail par jour</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <Table v-if="byDate.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nombre de sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in byDate" :key="row.date">
                <TableCell class="font-medium">
                  {{ new Date(row.date).toLocaleDateString('fr-FR') }}
                </TableCell>
                <TableCell>{{ row.count }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-muted-foreground text-sm">
            Aucune donnée.
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
