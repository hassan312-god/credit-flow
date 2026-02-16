<script setup lang="ts">
import type { Database } from '~/types/database'
import { Search, Plus, Phone, Mail } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

type ClientRow = Database['public']['Tables']['clients']['Row']

const clients = ref<ClientRow[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')

async function fetchClients() {
  loading.value = true
  error.value = ''
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (e) throw e
    clients.value = data ?? []
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement clients'
  }
  finally {
    loading.value = false
  }
}

const filteredClients = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return clients.value
  return clients.value.filter(c =>
    c.full_name.toLowerCase().includes(q)
    || (c.phone && c.phone.includes(q))
    || (c.email && c.email.toLowerCase().includes(q))
    || (c.id_number && c.id_number.toLowerCase().includes(q)),
  )
})

onMounted(() => fetchClients())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Clients
      </h2>
      <div class="flex items-center gap-2">
        <div class="relative w-64">
          <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            placeholder="Rechercher (nom, téléphone, email…)"
            class="pl-8"
          />
        </div>
        <Button as-child>
          <NuxtLink to="/clients/new">
            <Plus class="mr-2 size-4" />
            Nouveau client
          </NuxtLink>
        </Button>
      </div>
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
          <Table v-if="filteredClients.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Pièce</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="c in filteredClients" :key="c.id">
                <TableCell class="font-medium">
                  <NuxtLink :to="`/clients/${c.id}`" class="hover:underline">
                    {{ c.full_name }}
                  </NuxtLink>
                </TableCell>
                <TableCell>
                  <span class="flex items-center gap-1.5">
                    <Phone class="size-3.5 text-muted-foreground" />
                    {{ c.phone }}
                  </span>
                </TableCell>
                <TableCell>
                  <span v-if="c.email" class="flex items-center gap-1.5">
                    <Mail class="size-3.5 text-muted-foreground" />
                    {{ c.email }}
                  </span>
                  <span v-else class="text-muted-foreground">—</span>
                </TableCell>
                <TableCell>
                  {{ c.id_type }} {{ c.id_number }}
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ new Date(c.created_at).toLocaleDateString('fr-FR') }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-12 text-center text-muted-foreground">
            Aucun client trouvé.
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
