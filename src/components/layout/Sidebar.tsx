import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Activity,
  Cloud,
  RefreshCw,
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useSidebarContext } from './SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';

const menuItems = [
  { 
    path: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Tableau de bord',
    roles: ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement']
  },
  { 
    path: '/clients', 
    icon: Users, 
    label: 'Clients',
    roles: ['directeur', 'agent_credit'] // Admin ne voit pas clients
  },
  { 
    path: '/prets', 
    icon: FileText, 
    label: 'Prêts',
    roles: ['directeur', 'agent_credit', 'caissier', 'recouvrement'] // Admin ne voit pas prêts
  },
  { 
    path: '/reports', 
    icon: BarChart3, 
    label: 'Rapports',
    roles: ['admin', 'directeur']
  },
  { 
    path: '/users', 
    icon: Shield, 
    label: 'Utilisateurs',
    roles: ['admin', 'directeur']
  },
  { 
    path: '/company-funds', 
    icon: Wallet, 
    label: 'Fond de l\'entreprise',
    roles: ['directeur'] // Admin ne voit pas fonds
  },
  { 
    path: '/settings', 
    icon: Settings, 
    label: 'Paramètres',
    roles: ['admin']
  },
  // Section Temps de travail / Présence
  { 
    path: '/horaires', 
    icon: Clock, 
    label: 'Horaires',
    roles: ['admin', 'directeur']
  },
  // Section Administration
  { 
    path: '/activity-logs', 
    icon: Activity, 
    label: 'Journal d\'activité',
    roles: ['admin']
  },
  { 
    path: '/sync-status', 
    icon: Cloud, 
    label: 'Synchronisation hors ligne',
    roles: ['admin']
  },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  agent_credit: 'Agent de crédit',
  caissier: 'Caissier',
  recouvrement: 'Recouvrement',
};

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebarContext();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleNavClick = () => {
    // Fermer le menu mobile après navigation
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const filteredMenuItems = menuItems.filter(
    item => role && item.roles.includes(role)
  );

  return (
    <>
      <aside className={cn(
        "sidebar-container fixed left-0 top-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 z-40",
        // Desktop
        isCollapsed ? "md:w-20" : "md:w-64",
        // Mobile: overlay - toujours largeur complète avec noms visibles
        isMobile && (isMobileOpen ? "w-64" : "-translate-x-full"),
        !isMobile && "translate-x-0"
      )}>
      {/* Logo officiel N'FA KA SÉRUM */}
      <div className={cn(
        "border-b border-sidebar-border transition-all relative",
        isCollapsed ? "p-4" : "p-6"
      )}>
        {isCollapsed ? (
          <div className="flex items-center justify-center gap-1.5">
            <img 
              src="https://rrgbccnkkarwasrmfnmc.supabase.co/storage/v1/object/public/Logo/756de4a1-4384-4338-98e5-5812db0a8b40.png"
              alt="N'FA KA SÉRUM - Logo officiel"
              className="w-12 h-12 object-contain flex-shrink-0"
            />
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg hover:bg-sidebar-accent transition-colors flex-shrink-0"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src="https://rrgbccnkkarwasrmfnmc.supabase.co/storage/v1/object/public/Logo/756de4a1-4384-4338-98e5-5812db0a8b40.png"
                alt="N'FA KA SÉRUM - Logo officiel"
                className="w-16 h-16 object-contain flex-shrink-0 transition-all"
              />
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-bold text-lg text-sidebar-foreground leading-tight">
                  N'FA KA SÉRUM
                </h1>
                <p className="text-xs text-sidebar-foreground/60 mt-0.5">Gestion des prêts</p>
              </div>
            </div>
            {/* Bouton fermer sur mobile, collapse sur desktop */}
            {isMobile ? (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors flex-shrink-0"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5 text-sidebar-foreground" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors flex-shrink-0"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-scrollbar flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={(e) => {
              // Ne pas ouvrir la sidebar automatiquement lors de la navigation
              // La sidebar reste dans son état actuel (fermée ou ouverte)
              e.stopPropagation();
              handleNavClick();
            }}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'bg-white/5 hover:bg-white/10',
                isActive && 'bg-sidebar-accent text-sidebar-foreground',
                !isActive && 'text-sidebar-foreground/70',
                // Sur mobile, toujours afficher les noms (pas de collapse)
                isCollapsed && !isMobile && 'justify-center px-2'
              )
            }
            title={isCollapsed && !isMobile ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {/* Toujours afficher les noms sur mobile, sinon selon isCollapsed */}
            {(isMobile || !isCollapsed) && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 mb-3",
          isCollapsed && !isMobile && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {role ? roleLabels[role] : 'Chargement...'}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
          title={isCollapsed && !isMobile ? "Déconnexion" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(isMobile || !isCollapsed) && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
