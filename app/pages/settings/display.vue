<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { sidebar, updateAppSettings } = useAppSettings()
const direction = useTextDirection()

function setSide(side: 'left' | 'right') {
  updateAppSettings({ sidebar: { side } })
  direction.value = side === 'right' ? 'rtl' : 'ltr'
}

function setVariant(v: 'sidebar' | 'floating' | 'inset') {
  updateAppSettings({ sidebar: { variant: v } })
}

function setCollapsible(c: 'offcanvas' | 'icon' | 'none') {
  updateAppSettings({ sidebar: { collapsible: c } })
}
</script>

<template>
  <SettingsLayout>
    <Card>
      <CardHeader>
        <CardTitle>Affichage</CardTitle>
        <CardDescription>
          Barre latérale et disposition. Enregistrés localement (cookie).
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-6">
        <div class="space-y-2">
          <Label>Position de la barre</Label>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.side === 'left' }"
              @click="setSide('left')"
            >
              Gauche (LTR)
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.side === 'right' }"
              @click="setSide('right')"
            >
              Droite (RTL)
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <Label>Type de barre latérale</Label>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.variant === 'sidebar' }"
              @click="setVariant('sidebar')"
            >
              Sidebar
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.variant === 'floating' }"
              @click="setVariant('floating')"
            >
              Floating
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.variant === 'inset' }"
              @click="setVariant('inset')"
            >
              Inset
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <Label>Comportement replié</Label>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.collapsible === 'offcanvas' }"
              @click="setCollapsible('offcanvas')"
            >
              Offcanvas
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.collapsible === 'icon' }"
              @click="setCollapsible('icon')"
            >
              Icon
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'border-primary border-2 bg-primary/10': sidebar?.collapsible === 'none' }"
              @click="setCollapsible('none')"
            >
              None
            </Button>
          </div>
        </div>
        <p class="text-muted-foreground text-xs">
          Options du composable useAppSettings (cookie app_settings).
        </p>
      </CardContent>
    </Card>
  </SettingsLayout>
</template>
