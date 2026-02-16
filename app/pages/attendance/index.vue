<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface WorkSession {
  id: string
  user_id: string
  work_date: string
  opened_at: string
  closed_at: string | null
  status: string
  initial_cash: number | null
  final_cash: number | null
  is_late: boolean | null
  late_minutes: number | null
  notes: string | null
  created_at: string
}

const sessions = ref<WorkSession[]>([])
const loading = ref(true)
const error = ref('')

async function fetchSessions() {
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
      .select('*')
      .order('work_date', { ascending: false })
      .order('opened_at', { ascending: false })
      .limit(100)
    if (e)
      throw e
    sessions.value = (data ?? []) as WorkSession[]
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement présence'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchSessions())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <h2 class="text-2xl font-bold tracking-tight">
      Présence (sessions de travail)
    </h2>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <Card v-else>
      <CardContent class="p-0">
        <div v-if="loading" class="py-12 text-center text-muted-foreground">
          Chargement…
        </div>
        <template v-else>
          <Table v-if="sessions.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ouverture</TableHead>
                <TableHead>Fermeture</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Retard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in sessions" :key="s.id">
                <TableCell class="font-medium">
                  {{ new Date(s.work_date).toLocaleDateString('fr-FR') }}
                </TableCell>
                <TableCell>{{ s.opened_at }}</TableCell>
                <TableCell>{{ s.closed_at || '—' }}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {{ s.status }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span v-if="s.is_late" class="text-destructive text-sm">{{ s.late_minutes ?? 0 }} min</span>
                  <span v-else class="text-muted-foreground">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucune session.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
