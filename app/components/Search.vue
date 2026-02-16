<script setup lang="ts">
import type { NavMenu, NavLink, NavGroup } from '~/types/nav'
import { navMenu } from '~/constants/menus'

interface CommandEntry {
  title: string
  link: string
  icon?: string
  group: string
}

const { metaSymbol } = useShortcuts()
const openCommand = ref(false)
const router = useRouter()

defineShortcuts({
  Meta_K: () => { openCommand.value = true },
})

const commandEntries = computed<CommandEntry[]>(() => {
  const entries: CommandEntry[] = []
  for (const nav of navMenu) {
    for (const item of nav.items) {
      if ('link' in item && item.link && !item.link.startsWith('http')) {
        entries.push({
          title: item.title,
          link: item.link,
          icon: item.icon,
          group: nav.heading,
        })
      }
      if ('children' in item && item.children) {
        for (const child of item.children as NavLink[]) {
          if (child.link && !child.link.startsWith('http')) {
            entries.push({
              title: child.title,
              link: child.link,
              icon: child.icon,
              group: nav.heading,
            })
          }
        }
      }
    }
  }
  return entries
})

const groups = computed(() => {
  const map = new Map<string, CommandEntry[]>()
  for (const e of commandEntries.value) {
    const list = map.get(e.group) ?? []
    list.push(e)
    map.set(e.group, list)
  }
  return Array.from(map.entries())
})

function handleSelect(link: string) {
  router.push(link)
  openCommand.value = false
}
</script>

<template>
  <SidebarMenuButton as-child tooltip="Recherche">
    <Button variant="outline" size="sm" class="text-xs" @click="openCommand = true">
      <Icon name="i-lucide-search" />
      <span class="font-normal group-data-[collapsible=icon]:hidden">Rechercher…</span>
      <div class="ml-auto flex items-center gap-0.5 group-data-[collapsible=icon]:hidden">
        <Kbd>{{ metaSymbol }}</Kbd>
        <Kbd>K</Kbd>
      </div>
    </Button>
  </SidebarMenuButton>

  <CommandDialog v-model:open="openCommand">
    <CommandInput placeholder="Tapez une commande ou recherchez…" />
    <CommandList>
      <CommandEmpty>Aucun résultat.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="tableau de bord" @select="handleSelect('/')">
          <Icon name="i-lucide-layout-dashboard" class="size-4" />
          Tableau de bord
          <CommandShortcut><Kbd>G</Kbd><Kbd>H</Kbd></CommandShortcut>
        </CommandItem>
        <CommandItem value="clients" @select="handleSelect('/clients')">
          <Icon name="i-lucide-users" class="size-4" />
          Clients
          <CommandShortcut><Kbd>G</Kbd><Kbd>C</Kbd></CommandShortcut>
        </CommandItem>
        <CommandItem value="prêts" @select="handleSelect('/loans')">
          <Icon name="i-lucide-hand-coins" class="size-4" />
          Prêts
          <CommandShortcut><Kbd>G</Kbd><Kbd>L</Kbd></CommandShortcut>
        </CommandItem>
        <CommandItem value="paramètres" @select="handleSelect('/settings/profile')">
          <Icon name="i-lucide-settings" class="size-4" />
          Paramètres
          <CommandShortcut><Kbd>G</Kbd><Kbd>S</Kbd></CommandShortcut>
        </CommandItem>
      </CommandGroup>
      <template v-for="[groupName, items] in groups" :key="groupName">
        <CommandSeparator />
        <CommandGroup :heading="groupName">
          <CommandItem
            v-for="entry in items"
            :key="entry.link + entry.title"
            :value="entry.title"
            class="gap-2"
            @select="handleSelect(entry.link)"
          >
            <Icon v-if="entry.icon" :name="entry.icon" class="size-4" />
            {{ entry.title }}
          </CommandItem>
        </CommandGroup>
      </template>
    </CommandList>
  </CommandDialog>
</template>
