import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
const projectRoot = process.cwd()

export default defineNuxtConfig({
  devtools: { enabled: false },

  srcDir: 'app',

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      origin: 'http://localhost:3000',
      fs: {
        strict: true,
        allow: [
          projectRoot,
          path.join(projectRoot, 'node_modules'),
          path.join(projectRoot, 'node_modules', '.cache'),
        ],
      },
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 3000,
      },
    },
    optimizeDeps: {
      include: ['@number-flow/vue', '@internationalized/date'],
    },
  },

  components: [
    {
      path: '~/components',
      extensions: ['.vue'],
    },
  ],

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
  ],

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "~/components/ui"
     */
    componentDir: '~/components/ui',
  },

  colorMode: {
    classSuffix: '',
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  fonts: {
    defaults: {
      weights: [300, 400, 500, 600, 700, 800],
    },
  },

  routeRules: {
    '/settings': { redirect: '/settings/profile' },
    // Pagination (Reka UI) provoque une 500 au prerender ; rendu côté client uniquement.
    '/components/pagination': { ssr: false },
    // Routes protégées : ne pas pré-rendre (pas de session en build → 500).
    '/users': { prerender: false },
    '/company-funds': { prerender: false },
    '/horaires': { prerender: false },
    '/attendance': { prerender: false },
    '/attendance-reports': { prerender: false },
    '/activity-logs': { prerender: false },
    '/sync-status': { prerender: false },
    '/reports': { prerender: false },
    '/clients': { prerender: false },
    '/clients/new': { prerender: false },
    '/loans': { prerender: false },
    '/loans/new': { prerender: false },
    '/payments': { prerender: false },
    '/recovery': { prerender: false },
    '/settings/**': { prerender: false },
    '/clients/**': { prerender: false },
    '/loans/**': { prerender: false },
  },

  // Éviter l'échec du build (Vercel) quand le prerender rencontre des 500 sur des routes
  // protégées (pas de session en build) ou des pages composants.
  nitro: {
    prerender: {
      crawlLinks: process.env.CI !== 'true',
      // Ne pas faire échouer le build si une route en prerender renvoie 500 (ex. pages auth).
      failOnError: false,
      routes: ['/', '/404', '/200', '/auth/login'],
      ignore: [
        '/components',
        '/examples/forms',
        '/terms',
        '/privacy',
        '/docs',
        // Routes protégées : pas de contexte auth en build → 500. On ne les pré-rend pas.
        '/users',
        '/company-funds',
        '/settings/notifications',
        '/settings/account',
        '/settings/profile',
        '/settings/display',
        '/settings/appearance',
        '/horaires',
        '/attendance',
        '/attendance-reports',
        '/activity-logs',
        '/sync-status',
        '/clients',
        '/clients/new',
        '/clients/*',
        '/loans',
        '/loans/new',
        '/loans/*',
        '/payments',
        '/recovery',
        '/reports',
      ],
    },
  },

  imports: {
    dirs: [
      './lib',
    ],
  },

  compatibilityDate: '2024-12-14',

  // Évite l'avertissement console : "The resource .../dev.json was preloaded but not used"
  // (appManifest désactive le preload des meta de build ; désactive aussi le check "nouvelle version").
  experimental: {
    appManifest: false,
  },
})
