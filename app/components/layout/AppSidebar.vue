<script setup lang="ts">
import type { NavGroup, NavLink, NavSectionTitle } from '~/types/nav'
import { getNavMenuForRole, roleLabels } from '~/constants/menuAccess'
import { navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')
  return resolveComponent('LayoutSidebarNavLink')
}

const teams = [
  { name: 'N\'FA KA SÉRUM', logo: 'credit-flow-logo', plan: '' },
]

const { sidebar } = useAppSettings()
const { role, profile } = useAuthRole()

const navMenuFiltered = computed(() => getNavMenuForRole(role.value))

const user = computed(() => {
  const fullName = profile.value?.full_name?.trim()
  const email = profile.value?.email ?? ''
  const displayName = (fullName && fullName !== email) ? fullName : 'Utilisateur'
  const avatarUrl = profile.value?.avatar_url?.trim()
  return {
    name: displayName,
    email,
    avatar: avatarUrl || '/avatars/avatartion.png',
    roleLabel: role.value ? roleLabels[role.value] : '',
  }
})
</script>

<template>
  <Sidebar :collapsible="sidebar?.collapsible" :side="sidebar?.side" :variant="sidebar?.variant">
    <SidebarHeader>
      <LayoutSidebarNavHeader :teams="teams" />
      <Search />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="(nav, indexGroup) in navMenuFiltered" :key="indexGroup">
        <SidebarGroupLabel v-if="nav.heading">
          {{ nav.heading }}
        </SidebarGroupLabel>
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
      </SidebarGroup>
      <SidebarGroup v-if="navMenuBottom.length > 0" class="mt-auto">
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in navMenuBottom" :key="index" :item="item" size="sm" />
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped>

</style>
