<script setup lang="ts">
import { THEME_COLORS, THEME_TYPE } from '~/constants/themes'

definePageMeta({ layout: 'default' })

const { theme, updateAppSettings } = useAppSettings()
const colorNames = THEME_COLORS.map(c => c.name)
</script>

<template>
  <SettingsLayout>
    <Card>
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>
          Thème et couleurs. Enregistrés localement (cookie) pour cette session.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-6">
        <div class="space-y-2">
          <Label>Couleur</Label>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <Button
              v-for="name in colorNames"
              :key="name"
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': theme?.color === name }"
              @click="updateAppSettings({ theme: { color: name } })"
            >
              {{ name }}
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <Label>Type de thème</Label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="t in THEME_TYPE"
              :key="t"
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': theme?.type === t }"
              @click="updateAppSettings({ theme: { type: t } })"
            >
              {{ t }}
            </Button>
          </div>
        </div>
        <p class="text-muted-foreground text-xs">
          Ces options utilisent le cookie <code>app_settings</code> (composable useAppSettings).
        </p>
      </CardContent>
    </Card>
  </SettingsLayout>
</template>
