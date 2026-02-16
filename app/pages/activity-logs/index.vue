<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface AuditLog {
  id: string
  action: string
  table_name: string
  record_id: string | null
  user_id: string | null
  old_data: unknown
  new_data: unknown
  ip_address: string | null
  created_at: string
}

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const error = ref('')

async function fetchLogs() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (e)
      throw e
    logs.value = (data ?? []) as AuditLog[]
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement journaux'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => fetchLogs())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <h2 class="text-2xl font-bold tracking-tight">
      Journaux d'activité
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
          <Table v-if="logs.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Enregistrement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="log in logs" :key="log.id">
                <TableCell class="text-muted-foreground text-sm whitespace-nowrap">
                  {{ new Date(log.created_at).toLocaleString('fr-FR') }}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {{ log.action }}
                  </Badge>
                </TableCell>
                <TableCell>{{ log.table_name }}</TableCell>
                <TableCell class="max-w-24 truncate font-mono text-xs">
                  {{ log.record_id || '—' }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun journal.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
