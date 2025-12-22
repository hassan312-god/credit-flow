import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, UserPlus, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
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

export default function Users() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [submitting, setSubmitting] = useState(false);

  // Vérifier si l'utilisateur a accès à la gestion des utilisateurs
  const canManageUsers = role === 'admin' || role === 'directeur';

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

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
        };
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
                  <TableHead>Inscription</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
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
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {canManageUsers && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRoleDialog(user)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="directeur">Directeur</SelectItem>
                      <SelectItem value="agent_credit">Agent de crédit</SelectItem>
                      <SelectItem value="caissier">Caissier</SelectItem>
                      <SelectItem value="recouvrement">Recouvrement</SelectItem>
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
      </div>
    </MainLayout>
  );
}
