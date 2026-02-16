<script setup lang="ts">
definePageMeta({ layout: 'blank' })

/** Les comptes sont créés par l'admin ou le directeur (page Utilisateurs). */
await navigateTo('/auth/login', { replace: true })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
    <p class="text-muted-foreground">Redirection vers la connexion…</p>
  </div>
</template>
