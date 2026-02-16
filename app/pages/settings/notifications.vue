<script setup lang="ts">
definePageMeta({ layout: 'default' })

const STORAGE_KEY = 'credit_flow_notification_settings'

interface NotificationPrefs {
  email_notifications: boolean
  payment_reminders: boolean
  overdue_alerts: boolean
  reminder_days: number
}

const defaults: NotificationPrefs = {
  email_notifications: true,
  payment_reminders: true,
  overdue_alerts: true,
  reminder_days: 3,
}

const supabase = useSupabase()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')
const fromSupabase = ref(false)
const form = ref<NotificationPrefs>({ ...defaults })

async function load() {
  loading.value = true
  error.value = ''
  fromSupabase.value = false
  try {
    if (supabase) {
      const { data, error: e } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['email_notifications', 'payment_reminders', 'overdue_alerts', 'reminder_days'])
      if (!e && data?.length) {
        fromSupabase.value = true
        for (const row of data) {
          const key = row.key as keyof NotificationPrefs
          const val = row.value
          if (key === 'reminder_days')
            form.value.reminder_days = typeof val === 'number' ? val : Number(val) || 3
          else if (key in form.value)
            (form.value as Record<string, unknown>)[key] = Boolean(val)
        }
      }
    }
    if (!fromSupabase.value) {
      if (import.meta.client) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
            form.value = { ...defaults, ...parsed }
          }
        }
        catch {
          // keep defaults
        }
      }
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur chargement'
  }
  finally {
    loading.value = false
  }
}

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    if (supabase && fromSupabase.value) {
      const keys = ['email_notifications', 'payment_reminders', 'overdue_alerts', 'reminder_days'] as const
      for (const key of keys) {
        const value = key === 'reminder_days' ? form.value.reminder_days : form.value[key]
        const { error: e } = await supabase
          .from('app_settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        if (e)
          throw e
      }
      message.value = 'Paramètres enregistrés dans Supabase.'
    }
    else {
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form.value))
        message.value = 'Paramètres enregistrés localement (table app_settings non disponible ou non accessible).'
      }
    }
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur enregistrement'
  }
  finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <SettingsLayout>
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Préférences de notifications. Sauvegardées dans Supabase (table app_settings) si vous avez les droits, sinon en local.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="error" class="text-destructive text-sm mb-4">
          {{ error }}
        </p>
        <p v-if="message" class="text-green-600 text-sm mb-4">
          {{ message }}
        </p>
        <div v-if="loading" class="text-muted-foreground text-sm">
          Chargement…
        </div>
        <form v-else class="flex flex-col gap-6 max-w-md" @submit.prevent="save">
          <div class="flex items-center justify-between">
            <div>
              <Label>Notifications par email</Label>
              <p class="text-muted-foreground text-xs">
                Recevoir des emails de rappel et d'alerte.
              </p>
            </div>
            <Switch v-model:checked="form.email_notifications" />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <Label>Rappels de paiement</Label>
              <p class="text-muted-foreground text-xs">
                Rappels avant les échéances.
              </p>
            </div>
            <Switch v-model:checked="form.payment_reminders" />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <Label>Alertes de retard</Label>
              <p class="text-muted-foreground text-xs">
                Alertes pour les prêts en retard ou en défaut.
              </p>
            </div>
            <Switch v-model:checked="form.overdue_alerts" />
          </div>
          <div class="grid gap-2">
            <Label for="reminder_days">Jours avant échéance pour les rappels</Label>
            <Input
              id="reminder_days"
              v-model.number="form.reminder_days"
              type="number"
              min="1"
              max="30"
            />
          </div>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </SettingsLayout>
</template>
