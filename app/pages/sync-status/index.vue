<script setup lang="ts">
definePageMeta({ layout: 'default' })

const status = ref<'checking' | 'ok' | 'error'>('checking')
const errorMessage = ref('')
const lastCheck = ref<Date | null>(null)

async function checkConnection() {
  status.value = 'checking'
  errorMessage.value = ''
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      status.value = 'error'
      errorMessage.value = 'Supabase non configuré.'
      return
    }
    const { error } = await supabase.from('clients').select('id').limit(1)
    if (error)
      throw error
    status.value = 'ok'
    lastCheck.value = new Date()
  }
  catch (e: any) {
    status.value = 'error'
    errorMessage.value = e?.message || 'Impossible de joindre Supabase.'
  }
}

onMounted(() => checkConnection())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <h2 class="text-2xl font-bold tracking-tight">
      Synchronisation
    </h2>
    <p class="text-muted-foreground">
      État de la connexion à Supabase (même projet que l’app React Credit Flow).
    </p>

    <div class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-sm font-medium">
            Connexion Supabase
          </CardTitle>
          <CardDescription>
            Vérification de l’accès à la base.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
          <div v-if="status === 'checking'" class="flex items-center gap-2 text-muted-foreground">
            <span class="inline-block size-3 animate-pulse rounded-full bg-muted-foreground" />
            Vérification…
          </div>
          <div v-else-if="status === 'ok'" class="flex items-center gap-2 text-green-600">
            <span class="inline-block size-3 rounded-full bg-green-500" />
            Connecté
          </div>
          <div v-else class="flex flex-col gap-1">
            <div class="flex items-center gap-2 text-destructive">
              <span class="inline-block size-3 rounded-full bg-destructive" />
              Erreur
            </div>
            <p class="text-sm text-destructive">
              {{ errorMessage }}
            </p>
          </div>
          <p v-if="lastCheck" class="text-muted-foreground text-xs">
            Dernière vérification : {{ lastCheck.toLocaleTimeString('fr-FR') }}
          </p>
          <Button variant="outline" size="sm" class="w-fit mt-2" :disabled="status === 'checking'" @click="checkConnection">
            Actualiser
          </Button>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-sm font-medium">
          À propos
        </CardTitle>
      </CardHeader>
      <CardContent class="text-sm text-muted-foreground">
        Les données (clients, prêts, paiements, etc.) sont lues et écrites directement sur Supabase.
        Une synchronisation hors ligne (IndexedDB, file d’attente) peut être ajoutée ultérieurement.
      </CardContent>
    </Card>
  </div>
</template>
