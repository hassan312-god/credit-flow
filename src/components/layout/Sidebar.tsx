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
  Building2,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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
    roles: ['admin', 'directeur', 'agent_credit']
  },
  { 
    path: '/loans', 
    icon: FileText, 
    label: 'Prêts',
    roles: ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement']
  },
  { 
    path: '/payments', 
    icon: CreditCard, 
    label: 'Paiements',
    roles: ['admin', 'directeur', 'caissier']
  },
  { 
    path: '/recovery', 
    icon: AlertTriangle, 
    label: 'Recouvrement',
    roles: ['admin', 'directeur', 'recouvrement']
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
    path: '/settings', 
    icon: Settings, 
    label: 'Paramètres',
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredMenuItems = menuItems.filter(
    item => role && item.roles.includes(role)
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-sidebar-foreground">CréditPro</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestion des prêts</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'sidebar-item',
                isActive && 'sidebar-item-active'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {role ? roleLabels[role] : 'Chargement...'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
