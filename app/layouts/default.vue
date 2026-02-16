<script setup lang="ts">
const route = useRoute()
const { isAuthenticated, loading, role, canAccessPath } = useAuthRole()
const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password']

watchEffect(() => {
  if (import.meta.server || loading.value)
    return
  const path = route.path
  if (publicPaths.some(p => path.startsWith(p)))
    return
  if (!isAuthenticated.value) {
    navigateTo('/auth/login', { replace: true })
    return
  }
  if (!role.value && path !== '/') {
    navigateTo('/', { replace: true })
    return
  }
  if (role.value && !canAccessPath(path)) {
    navigateTo('/', { replace: true })
  }
})
</script>

<template>
  <SidebarProvider>
    <LayoutAppSidebar />
    <SidebarInset>
      <LayoutHeader />
      <div class="flex flex-col flex-1">
        <div class="@container/main p-4 lg:p-6 grow">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped>

</style>
