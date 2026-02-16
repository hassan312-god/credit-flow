<script setup lang="ts">
const links = [
  { title: 'Profil', href: '/settings/profile', icon: 'i-lucide-user' },
  { title: 'Compte', href: '/settings/account', icon: 'i-lucide-key' },
  { title: 'Apparence', href: '/settings/appearance', icon: 'i-lucide-palette' },
  { title: 'Notifications', href: '/settings/notifications', icon: 'i-lucide-bell' },
  { title: 'Affichage', href: '/settings/display', icon: 'i-lucide-monitor' },
]
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Paramètres
      </h2>
      <p class="text-muted-foreground text-sm mt-1">
        Gérez votre profil et les préférences de l'application.
      </p>
    </div>
    <div class="flex flex-col gap-4 md:flex-row md:gap-8">
      <nav class="flex shrink-0 flex-col gap-1 md:w-48">
        <NuxtLink
          v-for="item in links"
          :key="item.href"
          :to="item.href"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          active-class="bg-muted font-medium"
        >
          <Icon :name="item.icon" class="size-4" />
          {{ item.title }}
        </NuxtLink>
      </nav>
      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
