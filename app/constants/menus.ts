import type { NavMenu, NavMenuItems } from '~/types/nav'

/** Menu principal Credit Flow (N'FA KA SÉRUM) */
export const navMenu: NavMenu[] = [
  {
    heading: 'Principal',
    items: [
      {
        title: 'Tableau de bord',
        icon: 'i-lucide-layout-dashboard',
        link: '/',
      },
      {
        title: 'Clients',
        icon: 'i-lucide-users',
        link: '/clients',
      },
      {
        title: 'Prêts',
        icon: 'i-lucide-hand-coins',
        link: '/loans',
      },
      {
        title: 'Paiements',
        icon: 'i-lucide-wallet',
        link: '/payments',
      },
      {
        title: 'Recouvrement',
        icon: 'i-lucide-alert-triangle',
        link: '/recovery',
      },
      {
        title: 'Rapports',
        icon: 'i-lucide-file-bar-chart',
        link: '/reports',
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        title: 'Utilisateurs',
        icon: 'i-lucide-user-cog',
        link: '/users',
      },
      {
        title: 'Fonds société',
        icon: 'i-lucide-building-2',
        link: '/company-funds',
      },
      {
        title: 'Présence',
        icon: 'i-lucide-clipboard-check',
        children: [
          { title: 'Horaires', icon: 'i-lucide-clock', link: '/horaires' },
          { title: 'Présence', icon: 'i-lucide-user-check', link: '/attendance' },
          { title: 'Rapports présence', icon: 'i-lucide-file-check', link: '/attendance-reports' },
        ],
      },
      {
        title: 'Activité',
        icon: 'i-lucide-activity',
        link: '/activity-logs',
      },
      {
        title: 'Synchronisation',
        icon: 'i-lucide-refresh-cw',
        link: '/sync-status',
      },
    ],
  },
  {
    heading: 'Compte',
    items: [
      {
        title: 'Paramètres',
        icon: 'i-lucide-settings',
        children: [
          { title: 'Profil', icon: 'i-lucide-circle', link: '/settings/profile' },
          { title: 'Compte', icon: 'i-lucide-circle', link: '/settings/account' },
          { title: 'Apparence', icon: 'i-lucide-circle', link: '/settings/appearance' },
          { title: 'Notifications', icon: 'i-lucide-circle', link: '/settings/notifications' },
          { title: 'Affichage', icon: 'i-lucide-circle', link: '/settings/display' },
        ],
      },
      {
        title: 'Authentification',
        icon: 'i-lucide-lock-keyhole-open',
        children: [
          { title: 'Connexion', icon: 'i-lucide-circle', link: '/auth/login' },
          { title: 'Mot de passe oublié', icon: 'i-lucide-circle', link: '/auth/forgot-password' },
        ],
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
