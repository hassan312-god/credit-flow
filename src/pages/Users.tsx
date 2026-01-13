import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Shield, UserPlus, Loader2, AlertTriangle, Plus, Trash2, Key, MoreHorizontal, Ban, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, addHours, addWeeks, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';

type AppRole = Database['public']['Enums']['app_role'];

interface UserSuspension {
  id: string;
  suspended_until: string;
  reason: string | null;
  is_active: boolean;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
  suspension: UserSuspension | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  agent_credit: 'Agent de crédit',
  caissier: 'Caissier',
  recouvrement: 'Recouvrement',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  directeur: 'bg-primary/10 text-primary border-primary/20',
  agent_credit: 'bg-info/10 text-info border-info/20',
  caissier: 'bg-success/10 text-success border-success/20',
  recouvrement: 'bg-warning/10 text-warning border-warning/20',
};

const suspensionDurations = [
  { label: '1 heure', getValue: () => addHours(new Date(), 1) },
  { label: '24 heures', getValue: () => addDays(new Date(), 1) },
  { label: '3 jours', getValue: () => addDays(new Date(), 3) },
  { label: '1 semaine', getValue: () => addWeeks(new Date(), 1) },
  { label: '2 semaines', getValue: () => addWeeks(new Date(), 2) },
  { label: '1 mois', getValue: () => addMonths(new Date(), 1) },
  { label: '3 mois', getValue: () => addMonths(new Date(), 3) },
  { label: '6 mois', getValue: () => addMonths(new Date(), 6) },
  { label: '1 an', getValue: () => addMonths(new Date(), 12) },
];

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  full_name: z.string().min(2, 'Le nom complet doit contenir au moins 2 caractères'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement']),
});

export default function Users() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<UserWithRole | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: '' as AppRole | '',
  });

  // Vérifier si l'utilisateur a accès à la gestion des utilisateurs
  const canManageUsers = role === 'admin' || role === 'directeur';
  const isAdmin = role === 'admin';

  // Les directeurs ne peuvent pas voir ou modifier les admins
  const getVisibleRoles = (): AppRole[] => {
    if (isAdmin) {
      return ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'];
    } else {
      // Les directeurs ne voient pas le rôle admin
      return ['directeur', 'agent_credit', 'caissier', 'recouvrement'];
    }
  };

  const getSelectableRoles = (): AppRole[] => {
    if (isAdmin) {
      return ['admin', 'directeur', 'agent_credit', 'caissier', 'recouvrement'];
    } else {
      // Les directeurs ne peuvent pas assigner le rôle admin
      return ['directeur', 'agent_credit', 'caissier', 'recouvrement'];
    }
  };

  useEffect(() => {
    if (!canManageUsers) {
      navigate('/dashboard');
    }
  }, [canManageUsers, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      // Fetch all roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      // Fetch active suspensions
      const { data: suspensions } = await supabase
        .from('user_suspensions')
        .select('id, user_id, suspended_until, reason, is_active')
        .eq('is_active', true);

      // Combine data - filter out admins for directors
      const usersWithRoles: UserWithRole[] = (profiles || [])
        .map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          const userSuspension = suspensions?.find(s => s.user_id === profile.id && new Date(s.suspended_until) > new Date());
          return {
            ...profile,
            role: userRole?.role || null,
            role_id: userRole?.id || null,
            suspension: userSuspension ? {
              id: userSuspension.id,
              suspended_until: userSuspension.suspended_until,
              reason: userSuspension.reason,
              is_active: userSuspension.is_active,
            } : null,
          };
        })
        .filter(user => {
          // Si c'est un directeur, ne pas montrer les admins
          if (!isAdmin && user.role === 'admin') {
            return false;
          }
          return true;
        });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.role || '');
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !selectedRole) return;
    if (!canManageUsers) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour modifier les rôles');
      return;
    }

    // Empêcher un directeur de modifier un admin ou d'assigner le rôle admin
    if (!isAdmin) {
      if (selectedUser.role === 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires pour modifier un administrateur');
        return;
      }
      if (selectedRole === 'admin') {
        toast.error('Seul un administrateur peut attribuer le rôle administrateur');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (selectedUser.role_id) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: selectedRole as AppRole })
          .eq('id', selectedUser.role_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: selectedRole as AppRole });

        if (error) throw error;
      }

      toast.success('Rôle mis à jour avec succès');
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser?.role_id) return;
    if (!canManageUsers) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour supprimer les rôles');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', selectedUser.role_id);

      if (error) throw error;

      toast.success('Rôle supprimé');
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Erreur lors de la suppression du rôle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!canManageUsers) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour créer des utilisateurs');
      return;
    }

    const result = createUserSchema.safeParse(newUser);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setCreating(true);
    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création de l\'utilisateur');

      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with phone if provided
      if (newUser.phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: newUser.phone })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: newUser.role as AppRole,
        });

      if (roleError) throw roleError;

      toast.success('Utilisateur créé avec succès');
      setCreateDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: '',
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error('Erreur lors de la création de l\'utilisateur');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !isAdmin) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'delete',
            userId: userToDelete.id,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      toast.success('Utilisateur supprimé avec succès');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!userToChangePassword || !isAdmin || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'update_password',
            userId: userToChangePassword.id,
            newPassword: newPassword,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la modification');
      }

      toast.success('Mot de passe modifié avec succès');
      setPasswordDialogOpen(false);
      setUserToChangePassword(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!userToSuspend || !isAdmin || !suspensionDuration) return;

    const selectedDuration = suspensionDurations.find(d => d.label === suspensionDuration);
    if (!selectedDuration) {
      toast.error('Durée de suspension invalide');
      return;
    }

    setSuspending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'suspend',
            userId: userToSuspend.id,
            suspendUntil: selectedDuration.getValue().toISOString(),
            suspendReason: suspensionReason || null,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suspension');
      }

      toast.success('Utilisateur suspendu avec succès');
      setSuspendDialogOpen(false);
      setUserToSuspend(null);
      setSuspensionDuration('');
      setSuspensionReason('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error suspending user:', error);
      toast.error(error.message || 'Erreur lors de la suspension de l\'utilisateur');
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspendUser = async (user: UserWithRole) => {
    if (!isAdmin) return;

    setSuspending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'unsuspend',
            userId: user.id,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la levée de suspension');
      }

      toast.success('Suspension levée avec succès');
      fetchUsers();
    } catch (error: any) {
      console.error('Error unsuspending user:', error);
      toast.error(error.message || 'Erreur lors de la levée de la suspension');
    } finally {
      setSuspending(false);
    }
  };

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy', { locale: fr });

  if (!canManageUsers) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à la gestion des utilisateurs.
            Seuls les Administrateurs et Directeurs peuvent gérer les utilisateurs.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Gestion des Utilisateurs</h1>
          {canManageUsers && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer un utilisateur
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Liste des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium text-primary">
                              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">{user.phone || '-'}</TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge className={roleColors[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Aucun rôle
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.suspension ? (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            <Ban className="w-3 h-3 mr-1" />
                            Suspendu jusqu'au {format(new Date(user.suspension.suspended_until), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {canManageUsers && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRoleDialog(user)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Rôle
                            </Button>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {user.suspension ? (
                                    <DropdownMenuItem
                                      onClick={() => handleUnsuspendUser(user)}
                                      disabled={suspending}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Lever la suspension
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setUserToSuspend(user);
                                        setSuspensionDuration('');
                                        setSuspensionReason('');
                                        setSuspendDialogOpen(true);
                                      }}
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Suspendre
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setUserToChangePassword(user);
                                      setNewPassword('');
                                      setPasswordDialogOpen(true);
                                    }}
                                  >
                                    <Key className="w-4 h-4 mr-2" />
                                    Modifier mot de passe
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSelectableRoles().map((r) => (
                      <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setNewUser({
                      email: '',
                      password: '',
                      full_name: '',
                      phone: '',
                      role: '',
                    });
                  }}
                  disabled={creating}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={creating || !newUser.email || !newUser.password || !newUser.full_name || !newUser.role}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Role Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le rôle</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rôle</label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSelectableRoles().map((r) => (
                        <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-4">
                  {selectedUser.role && (
                    <Button
                      variant="destructive"
                      onClick={handleRemoveRole}
                      disabled={submitting}
                    >
                      Supprimer le rôle
                    </Button>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveRole} disabled={submitting || !selectedRole}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
                <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email}) ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le mot de passe</DialogTitle>
            </DialogHeader>
            {userToChangePassword && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">{userToChangePassword.full_name}</p>
                  <p className="text-sm text-muted-foreground">{userToChangePassword.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPasswordDialogOpen(false);
                      setNewPassword('');
                    }}
                    disabled={changingPassword}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || newPassword.length < 6}
                  >
                    {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Modifier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend User Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspendre l'utilisateur</DialogTitle>
            </DialogHeader>
            {userToSuspend && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">{userToSuspend.full_name}</p>
                  <p className="text-sm text-muted-foreground">{userToSuspend.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suspension-duration">Durée de suspension *</Label>
                  <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                    <SelectTrigger id="suspension-duration">
                      <SelectValue placeholder="Sélectionner une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      {suspensionDurations.map((d) => (
                        <SelectItem key={d.label} value={d.label}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suspension-reason">Raison (optionnel)</Label>
                  <Textarea
                    id="suspension-reason"
                    placeholder="Indiquez la raison de la suspension..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuspendDialogOpen(false);
                      setSuspensionDuration('');
                      setSuspensionReason('');
                    }}
                    disabled={suspending}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSuspendUser}
                    disabled={suspending || !suspensionDuration}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {suspending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Ban className="w-4 h-4 mr-2" />
                    Suspendre
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
