<script setup lang="ts">
import { useSidebar } from '~/components/ui/sidebar'

const props = defineProps<{
  teams: {
    name: string
    logo: string
    plan: string
  }[]
}>()

const { isMobile } = useSidebar()

const activeTeam = ref(props.teams[0])
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="aspect-square size-12 flex shrink-0 items-center justify-center rounded-lg overflow-hidden bg-transparent">
              <img v-if="activeTeam!.logo === 'credit-flow-logo'" src="/favicon.ico" alt="N'FA KA SÉRUM" class="size-full object-contain p-1 [mix-blend-mode:darken]">
              <Icon v-else :name="activeTeam!.logo" class="size-6 text-sidebar-primary-foreground" />
            </div>
            <div class="grid min-w-0 flex-1 text-left leading-tight">
              <span class="truncate font-semibold text-sm">{{ activeTeam!.name }}</span>
              <span v-if="activeTeam!.plan" class="truncate text-xs text-muted-foreground">{{ activeTeam!.plan }}</span>
            </div>
            <Icon name="i-lucide-chevrons-up-down" class="ml-auto size-4 shrink-0" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="min-w-56 w-[--radix-dropdown-menu-trigger-width] rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Teams
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="(team, index) in teams"
            :key="team.name"
            class="gap-2 p-2"
            @click="activeTeam = team"
          >
            <div class="size-6 flex items-center justify-center border rounded-sm overflow-hidden bg-transparent">
              <img v-if="team.logo === 'credit-flow-logo'" src="/favicon.ico" alt="" class="size-full object-contain [mix-blend-mode:darken]">
              <Icon v-else :name="team.logo" class="size-4 shrink-0" />
            </div>
            {{ team.name }}
            <DropdownMenuShortcut>⌘{{ index + 1 }}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="gap-2 p-2">
            <div class="size-6 flex items-center justify-center border rounded-md bg-background">
              <Icon name="i-lucide-plus" class="size-4" />
            </div>
            <div class="text-muted-foreground font-medium">
              Add team
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped>

</style>
