import type { AppRole } from '~/types/database'
import type { NavGroup, NavLink, NavMenu } from '~/types/nav'
import { navMenu } from '~/constants/menus'

/**
 * Accès par chemin (référence: credit-flow-reference Sidebar.tsx + RLS).
 * Admin = supervision uniquement (pas clients/prêts opérationnels).
 */
export const pathRoles: Record<string, AppRole[]> = {
  '/': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/clients': ['directeur', 'agent_credit'],
  '/clients/new': ['directeur', 'agent_credit'],
  '/clients/*': ['directeur', 'agent_credit'],
  '/loans': ['directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/loans/new': ['directeur', 'agent_credit'],
  '/loans/*': ['directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/payments': ['directeur', 'caissier', 'recouvrement'],
  '/recovery': ['directeur', 'agent_credit', 'recouvrement'],
  '/reports': ['admin', 'directeur'],
  '/users': ['admin', 'directeur'],
  '/company-funds': ['admin', 'directeur'],
  '/horaires': ['admin', 'directeur'],
  '/attendance': ['admin', 'directeur'],
  '/attendance-reports': ['admin', 'directeur'],
  '/activity-logs': ['admin'],
  '/sync-status': ['admin'],
  '/settings/profile': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/settings/account': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/settings/appearance': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/settings/notifications': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/settings/display': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
  '/settings/*': ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'],
}

export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  agent_credit: 'Agent de crédit',
  caissier: 'Caissier',
  recouvrement: 'Recouvrement',
}

function pathMatches(path: string, pattern: string): boolean {
  if (pattern === path)
    return true
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return path === prefix || path.startsWith(prefix)
  }
  return false
}

export function getRolesForPath(path: string): AppRole[] | null {
  const exact = pathRoles[path]
  if (exact)
    return exact
  for (const [pattern, roles] of Object.entries(pathRoles)) {
    if (pathMatches(path, pattern))
      return roles
  }
  return null
}

export function canAccessPath(path: string, role: AppRole | null): boolean {
  if (!role)
    return false
  const roles = getRolesForPath(path)
  if (!roles)
    return true
  return roles.includes(role)
}

function _itemHasAccess(item: NavLink | NavGroup, role: AppRole | null): boolean {
  if (!role)
    return false
  if ('link' in item && item.link) {
    return canAccessPath(item.link, role)
  }
  if ('children' in item && item.children) {
    return item.children.some((c: NavLink) => c.link && canAccessPath(c.link, role))
  }
  return false
}

function filterNavItem(item: NavLink | NavGroup, role: AppRole | null): NavLink | NavGroup | null {
  if ('children' in item && item.children) {
    const filteredChildren = item.children.filter((c: NavLink) => c.link && canAccessPath(c.link, role))
    if (filteredChildren.length === 0)
      return null
    return { ...item, children: filteredChildren }
  }
  if ('link' in item) {
    return canAccessPath(item.link, role) ? item : null
  }
  return null
}

export function getNavMenuForRole(role: AppRole | null): NavMenu[] {
  if (!role)
    return []
  return navMenu
    .map((group) => {
      const items = group.items
        .map(item => filterNavItem(item, role))
        .filter((item): item is NavLink | NavGroup => item != null)
      if (items.length === 0)
        return null
      return { ...group, items }
    })
    .filter((group): group is NavMenu => group != null)
}
