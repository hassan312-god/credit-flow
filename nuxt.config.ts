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
  },

  // Éviter l'échec du build (generate) quand le prerender rencontre des 404/500 sur des routes
  // liées par les pages composants (docs, examples, terms, privacy, /components, pagination).
  nitro: {
    prerender: {
      crawlLinks: process.env.CI !== 'true',
      failOnError: process.env.CI === 'true' ? false : true,
      routes: ['/', '/404', '/200', '/auth/login'],
      ignore: ['/components', '/examples/forms', '/terms', '/privacy', '/docs'],
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
