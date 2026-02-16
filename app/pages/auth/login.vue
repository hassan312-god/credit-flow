<script setup lang="ts">
import { Eye, EyeOff, Mail } from 'lucide-vue-next'

definePageMeta({ layout: 'blank' })

const { isAuthenticated } = useAuthRole()
watch(isAuthenticated, (v) => {
  if (v)
    navigateTo('/', { replace: true })
}, { immediate: true })

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const message = ref('')

async function submit() {
  error.value = ''
  message.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Email et mot de passe requis.'
    return
  }
  loading.value = true
  try {
    const supabase = useSupabase().value
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { error: e } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    if (e)
      throw e
    const { refresh } = useAuthRole()
    await refresh()
    message.value = 'Connexion réussie.'
    await nextTick()
    await navigateTo('/', { replace: true })
  }
  catch (e: any) {
    console.error('Auth login failed:', e)
    const msg = e?.message ?? e?.error_description ?? e?.msg ?? 'Erreur de connexion.'
    error.value = msg
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Fond (arrière-plan global) -->
  <div class="min-h-screen flex items-center justify-center p-4 bg-[#0d281f]">
    <!-- Carte (bloc formulaire + panneau) posée sur le fond, bordure blanche -->
    <div class="w-full max-w-5xl rounded-2xl border-2 border-white bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row">
      <!-- Partie gauche : formulaire -->
      <div class="flex-1 flex flex-col p-8 lg:p-10 lg:min-h-[520px]">
        <div class="flex flex-col flex-1">
          <div class="flex items-center gap-2 mb-8">
            <img src="/favicon.ico" alt="N'FA KA SÉRUM" class="size-10 object-contain [mix-blend-mode:darken]">
            <span class="text-xl font-semibold text-[#0d281f]">N'FA KA SÉRUM</span>
          </div>
          <h1 class="text-2xl lg:text-3xl font-bold text-[#0d281f] tracking-tight">
            Connexion
          </h1>
          <p class="text-muted-foreground mt-1 mb-6">
            Bienvenue. Entrez votre email et votre mot de passe.
          </p>

          <p v-if="error" class="text-destructive text-sm mb-2">
            {{ error }}
          </p>
          <p v-if="message" class="text-[#0d281f] text-sm mb-2">
            {{ message }}
          </p>

          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div class="grid gap-2">
              <Label for="email" class="text-foreground">Email</Label>
              <div class="relative">
                <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="Votre email"
                  autocomplete="email"
                  class="pr-10 h-11 rounded-lg"
                />
                <Mail class="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div class="grid gap-2">
              <Label for="password" class="text-foreground">Mot de passe</Label>
              <div class="relative">
                <Input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Mot de passe"
                  autocomplete="current-password"
                  class="pr-10 h-11 rounded-lg"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  tabindex="-1"
                  @click="showPassword = !showPassword"
                >
                  <Eye v-if="!showPassword" class="size-4" />
                  <EyeOff v-else class="size-4" />
                </button>
              </div>
              <NuxtLink
                to="/auth/forgot-password"
                class="text-sm text-destructive hover:underline"
              >
                Mot de passe oublié ?
              </NuxtLink>
            </div>
            <Button
              type="submit"
              class="w-full h-11 rounded-lg bg-[#0d281f] hover:bg-[#0d281f]/90 text-white font-semibold uppercase tracking-wide"
              :disabled="loading"
            >
              {{ loading ? 'Connexion…' : 'Connexion' }}
            </Button>
          </form>
        </div>
        <p class="text-muted-foreground text-xs mt-6">
          © N'FA KA SÉRUM {{ new Date().getFullYear() }}
        </p>
      </div>

      <!-- Partie droite : panneau informatif + mockup app -->
      <div class="hidden lg:flex lg:w-[48%] flex-col justify-between bg-[#0d281f] p-8 text-white">
        <div>
          <h2 class="text-2xl font-bold leading-tight">
            La gestion de crédit et de trésorerie, simplifiée.
          </h2>
          <p class="text-white/80 mt-2 text-sm">
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <!-- Mockup : aperçu dashboard + mini carte connexion -->
        <div class="relative mt-6 flex-1 min-h-[240px]">
          <!-- Fenêtre dashboard (arrière-plan) -->
          <div class="absolute inset-0 rounded-xl border border-white/20 bg-white/5 overflow-hidden backdrop-blur-sm">
            <div class="flex h-full min-h-[220px]">
              <!-- Sidebar mockup -->
              <div class="w-14 shrink-0 bg-[#0d281f] border-r border-white/10 flex flex-col items-center py-2 gap-1">
                <div class="w-6 h-6 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/30" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20 mt-2" />
              </div>
              <!-- Contenu principal mockup -->
              <div class="flex-1 p-3 flex flex-col gap-2">
                <div class="text-white/90 text-xs font-semibold">
                  Bienvenue
                </div>
                <div class="flex gap-1.5">
                  <div class="h-8 w-12 rounded bg-white/15" />
                  <div class="h-8 w-12 rounded bg-white/15" />
                  <div class="h-8 w-12 rounded bg-white/15" />
                </div>
                <div class="mt-1 space-y-1">
                  <div class="h-2 w-full rounded bg-white/10" />
                  <div class="h-2 w-4/5 rounded bg-white/10" />
                  <div class="h-2 w-3/4 rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>
          <!-- Mini carte connexion superposée -->
          <div class="absolute right-0 bottom-0 w-[72%] max-w-[200px] rounded-lg border-2 border-white bg-white shadow-xl p-2.5 text-left transform rotate-[-3deg]">
            <div class="flex items-center gap-1 mb-1.5">
              <img src="/favicon.ico" alt="" class="size-4 object-contain [mix-blend-mode:darken]">
              <span class="text-[10px] font-semibold text-[#0d281f]">N'FA KA SÉRUM</span>
            </div>
            <div class="text-[10px] font-bold text-[#0d281f]">
              Connexion
            </div>
            <div class="mt-1.5 space-y-1">
              <div class="h-5 rounded border border-gray-200 bg-gray-50 text-[9px] text-gray-400 px-1.5 flex items-center">
                email@exemple.com
              </div>
              <div class="h-5 rounded border border-gray-200 bg-gray-50 text-[9px] text-gray-400 px-1.5 flex items-center">
                ••••••••
              </div>
            </div>
            <div class="mt-1.5 h-5 rounded bg-[#0d281f] flex items-center justify-center">
              <span class="text-[8px] font-semibold text-white uppercase">Connexion</span>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/50 text-xs">
          <span>Tableau de bord</span>
          <span>·</span>
          <span>Clients</span>
          <span>·</span>
          <span>Prêts</span>
          <span>·</span>
          <span>Paiements</span>
        </div>
      </div>
    </div>
  </div>
</template>
