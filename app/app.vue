<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'
import { ConfigProvider } from 'reka-ui'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const colorMode = useColorMode()
// theme-color: valeur neutre en SSR pour limiter les hydration mismatches
const color = computed(() => (import.meta.client ? (colorMode.value === 'dark' ? '#09090b' : '#ffffff') : '#ffffff'))
const { theme } = useAppSettings()
const bodyClass = computed(() => `color-${theme.value?.color || 'default'} theme-${theme.value?.type || 'default'}`)

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color },
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
  ],
  htmlAttrs: {
    lang: 'en',
  },
  bodyAttrs: {
    class: bodyClass,
  },
})

const title = 'Credit Flow (N\'FA KA SÉRUM) — Gestion de crédit'
const description = 'Application de gestion de crédit et de prêts. Tableau de bord, clients, prêts, paiements, recouvrement. Nuxt, Shadcn Vue, Supabase.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://dashboard.dianprata.com',
  ogImage: 'https://nuxt-shadcn-dashboard.vercel.app/social-card.png',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: 'https://nuxt-shadcn-dashboard.vercel.app/social-card.png',
  twitterCard: 'summary_large_image',
})

const router = useRouter()

defineShortcuts({
  'G-H': () => router.push('/'),
  'G-C': () => router.push('/clients'),
  'G-L': () => router.push('/loans'),
  'G-S': () => router.push('/settings/profile'),
})

const textDirection = useTextDirection({ initialValue: 'ltr' })
const dir = computed(() => textDirection.value === 'rtl' ? 'rtl' : 'ltr')
</script>

<template>
  <Body class="overscroll-none antialiased bg-background text-foreground">
    <ConfigProvider :dir="dir">
      <div id="app" vaul-drawer-wrapper class="relative">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>

        <AppSettings />
      </div>

      <Toaster :theme="colorMode.preference as any || 'system'" />
    </ConfigProvider>

    <ClientOnly>
      <Analytics />
      <template #fallback></template>
    </ClientOnly>
  </Body>
</template>
