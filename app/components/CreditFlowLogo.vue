<script setup lang="ts">
withDefaults(
  defineProps<{
    class?: string
    size?: number | string
  }>(),
  { size: 32 },
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
    class="shrink-0"
    :class="$props.class"
    :width="size"
    :height="size"
  >
    <!-- Cercle / pièce principale -->
    <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2" fill="none" />
    <!-- Flux central (crédit qui circule) -->
    <path d="M20 8v10l4-4 2 2-7 7-7-7 2-2 4 4V8z" fill="currentColor" />
    <path d="M20 32v-10l-4 4-2-2 7-7 7 7-2 2-4-4V32z" fill="currentColor" opacity="0.7" />
    <!-- Petites pièces -->
    <circle cx="10" cy="14" r="3" stroke="currentColor" stroke-width="1.2" fill="none" />
    <circle cx="30" cy="26" r="3" stroke="currentColor" stroke-width="1.2" fill="none" />
  </svg>
</template>
