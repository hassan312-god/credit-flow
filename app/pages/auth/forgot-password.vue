<script setup lang="ts">
import { Mail } from 'lucide-vue-next'

definePageMeta({ layout: 'blank' })

const email = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')

async function submit() {
  error.value = ''
  message.value = ''
  if (!email.value.trim()) {
    error.value = 'Indiquez votre email.'
    return
  }
  loading.value = true
  try {
    const supabase = useSupabase()
    if (!supabase) {
      error.value = 'Supabase non configuré.'
      return
    }
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/auth/login`,
    })
    if (e)
      throw e
    message.value = 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.'
  }
  catch (e: any) {
    error.value = e?.message || 'Erreur lors de l\'envoi.'
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
            Mot de passe oublié
          </h1>
          <p class="text-muted-foreground mt-1 mb-6">
            Saisissez votre email pour recevoir un lien de réinitialisation.
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
            <Button
              type="submit"
              class="w-full h-11 rounded-lg bg-[#0d281f] hover:bg-[#0d281f]/90 text-white font-semibold uppercase tracking-wide"
              :disabled="loading"
            >
              {{ loading ? 'Envoi…' : 'Envoyer le lien' }}
            </Button>
          </form>
          <div class="mt-4">
            <NuxtLink to="/auth/login" class="text-sm text-[#0d281f] hover:underline font-medium">
              ← Retour à la connexion
            </NuxtLink>
          </div>
        </div>
        <p class="text-muted-foreground text-xs mt-6">
          © N'FA KA SÉRUM {{ new Date().getFullYear() }}
        </p>
      </div>

      <!-- Partie droite : panneau informatif + mockup -->
      <div class="hidden lg:flex lg:w-[48%] flex-col justify-between bg-[#0d281f] p-8 text-white">
        <div>
          <h2 class="text-2xl font-bold leading-tight">
            Réinitialisez votre mot de passe en toute sécurité.
          </h2>
          <p class="text-white/80 mt-2 text-sm">
            Un lien vous sera envoyé par email pour définir un nouveau mot de passe.
          </p>
        </div>

        <!-- Mockup : aperçu dashboard + mini carte -->
        <div class="relative mt-6 flex-1 min-h-[240px]">
          <div class="absolute inset-0 rounded-xl border border-white/20 bg-white/5 overflow-hidden backdrop-blur-sm">
            <div class="flex h-full min-h-[220px]">
              <div class="w-14 shrink-0 bg-[#0d281f] border-r border-white/10 flex flex-col items-center py-2 gap-1">
                <div class="w-6 h-6 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/30" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20" />
                <div class="w-5 h-0.5 rounded bg-white/20 mt-2" />
              </div>
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
          <div class="absolute right-0 bottom-0 w-[72%] max-w-[200px] rounded-lg border-2 border-white bg-white shadow-xl p-2.5 text-left transform rotate-[-3deg]">
            <div class="flex items-center gap-1 mb-1.5">
              <img src="/favicon.ico" alt="" class="size-4 object-contain [mix-blend-mode:darken]">
              <span class="text-[10px] font-semibold text-[#0d281f]">N'FA KA SÉRUM</span>
            </div>
            <div class="text-[10px] font-bold text-[#0d281f]">
              Mot de passe oublié
            </div>
            <div class="mt-1.5 space-y-1">
              <div class="h-5 rounded border border-gray-200 bg-gray-50 text-[9px] text-gray-400 px-1.5 flex items-center">
                Votre email
              </div>
            </div>
            <div class="mt-1.5 h-5 rounded bg-[#0d281f] flex items-center justify-center">
              <span class="text-[8px] font-semibold text-white uppercase">Envoyer le lien</span>
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
