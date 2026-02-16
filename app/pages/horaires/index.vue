<script setup lang="ts">
definePageMeta({ layout: 'default' })

const DAYS = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
]

interface WorkSchedule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

const supabase = useSupabase().value
const schedules = ref<WorkSchedule[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const allSchedules = ref<{ id: string, day_of_week: number, start_time: string, end_time: string, is_active: boolean }[]>([])

async function fetchSchedules() {
  loading.value = true
  error.value = ''
  try {
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { data, error: e } = await supabase.from('work_schedule').select('*').order('day_of_week')
    if (e)
      throw e
    schedules.value = (data ?? []) as WorkSchedule[]
    const existing = schedules.value
    allSchedules.value = []
    for (const day of DAYS) {
      const s = existing.find(x => x.day_of_week === day.value)
      if (s) {
        allSchedules.value.push({
          id: s.id,
          day_of_week: s.day_of_week,
          start_time: (s.start_time && String(s.start_time).slice(0, 5)) || '08:00',
          end_time: (s.end_time && String(s.end_time).slice(0, 5)) || '17:00',
          is_active: !!s.is_active,
        })
      }
      else {
        allSchedules.value.push({
          id: '',
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '17:00',
          is_active: day.value >= 1 && day.value <= 5,
        })
      }
    }
    allSchedules.value.sort((a, b) => a.day_of_week - b.day_of_week)
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement horaires'
  }
  finally {
    loading.value = false
  }
}

function setTime(dayOfWeek: number, field: 'start_time' | 'end_time', value: string) {
  const s = allSchedules.value.find(x => x.day_of_week === dayOfWeek)
  if (s)
    s[field] = value
}

function setActive(dayOfWeek: number, isActive: boolean) {
  const s = allSchedules.value.find(x => x.day_of_week === dayOfWeek)
  if (s)
    s.is_active = isActive
}

async function saveAll() {
  if (!supabase)
    return
  saving.value = true
  error.value = ''
  try {
    for (const s of allSchedules.value) {
      const payload = {
        day_of_week: s.day_of_week,
        start_time: `${s.start_time}:00`.slice(0, 8),
        end_time: `${s.end_time}:00`.slice(0, 8),
        is_active: s.is_active,
        updated_at: new Date().toISOString(),
        ...(s.id ? { id: s.id } : {}),
      }
      const { error: e } = await supabase.from('work_schedule').upsert(payload, { onConflict: 'day_of_week' })
      if (e)
        throw e
    }
    await fetchSchedules()
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur sauvegarde'
  }
  finally {
    saving.value = false
  }
}

onMounted(() => fetchSchedules())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Horaires de travail
      </h2>
      <Button :disabled="loading || saving" @click="saveAll">
        {{ saving ? 'Enregistrement…' : 'Enregistrer tout' }}
      </Button>
    </div>
    <p class="text-muted-foreground text-sm">
      Définissez les horaires pour chaque jour. Les directeurs et admins peuvent modifier. Enregistrez pour appliquer à tous les employés.
    </p>
    <p v-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      Chargement…
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="s in allSchedules" :key="s.day_of_week">
        <CardHeader class="pb-2">
          <CardTitle class="text-base">
            {{ DAYS.find(d => d.value === s.day_of_week)?.label }}
          </CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Switch :checked="s.is_active" @update:checked="(v: boolean) => setActive(s.day_of_week, v)" />
            <span class="text-sm">Jour travaillé</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="grid gap-1">
              <Label class="text-xs">Début</Label>
              <Input
                type="time"
                :value="s.start_time"
                :disabled="!s.is_active"
                @input="setTime(s.day_of_week, 'start_time', (($event.target as HTMLInputElement).value))"
              />
            </div>
            <div class="grid gap-1">
              <Label class="text-xs">Fin</Label>
              <Input
                type="time"
                :value="s.end_time"
                :disabled="!s.is_active"
                @input="setTime(s.day_of_week, 'end_time', (($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
