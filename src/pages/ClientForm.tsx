import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { OperationBlocked } from '@/components/OperationBlocked';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const clientSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  phone: z.string().min(8, 'Numéro de téléphone invalide').max(20),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  id_type: z.enum(['CNI', 'Passeport', 'Permis']),
  id_number: z.string().min(5, 'Numéro d\'identité invalide').max(50),
  address: z.string().max(200).optional(),
  profession: z.string().max(100).optional(),
  monthly_income: z.number().min(0).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientForm() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { canPerformOperations } = useWorkSession();
  const { isOnline, addToQueue } = useOfflineQueue();
  const [loading, setLoading] = useState(false);

  // Vérifier si l'utilisateur a accès aux clients
  const canAccessClients = role === 'admin' || role === 'directeur' || role === 'agent_credit';

  useEffect(() => {
    if (!canAccessClients) {
      navigate('/dashboard');
    }
  }, [canAccessClients, navigate]);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [formData, setFormData] = useState<ClientFormData>({
    full_name: '',
    phone: '',
    email: '',
    id_type: 'CNI',
    id_number: '',
    address: '',
    profession: '',
    monthly_income: undefined,
  });

  const handleChange = (field: keyof ClientFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const validatedData = clientSchema.parse({
        ...formData,
        email: formData.email || undefined,
        monthly_income: formData.monthly_income || undefined,
      });

      const clientData = {
        full_name: validatedData.full_name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        id_type: validatedData.id_type,
        id_number: validatedData.id_number,
        address: validatedData.address || null,
        profession: validatedData.profession || null,
        monthly_income: validatedData.monthly_income || null,
        created_by: user?.id || null,
      };

      // Si hors ligne, ajouter à la queue
      if (!isOnline) {
        await addToQueue({
          type: 'create_client',
          table: 'clients',
          data: clientData,
        });
        toast.success('Client ajouté à la file d\'attente. Il sera créé automatiquement lorsque la connexion sera rétablie.');
        navigate('/clients');
        return;
      }

      // Si en ligne, créer directement
      const { error } = await supabase.from('clients').insert(clientData);

      if (error) throw error;

      toast.success('Client créé avec succès');
      navigate('/clients');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ClientFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof ClientFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error('Erreur lors de la création du client');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canAccessClients) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Vous n'avez pas les permissions nécessaires pour créer un client.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <OperationBlocked operation="créer un client" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-3xl font-bold">Nouveau Client</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations du client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nom et prénom"
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+223 XX XX XX XX"
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="email@exemple.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_type">Type de pièce *</Label>
                  <Select value={formData.id_type} onValueChange={(v) => handleChange('id_type', v)}>
                    <SelectTrigger className={errors.id_type ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">Carte nationale d'identité</SelectItem>
                      <SelectItem value="Passeport">Passeport</SelectItem>
                      <SelectItem value="Permis">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_number">Numéro de pièce *</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => handleChange('id_number', e.target.value)}
                    placeholder="Numéro de la pièce"
                    className={errors.id_number ? 'border-destructive' : ''}
                  />
                  {errors.id_number && <p className="text-sm text-destructive">{errors.id_number}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => handleChange('profession', e.target.value)}
                    placeholder="Profession du client"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_income">Revenu mensuel (FCFA)</Label>
                  <Input
                    id="monthly_income"
                    type="number"
                    value={formData.monthly_income || ''}
                    onChange={(e) => handleChange('monthly_income', e.target.value ? Number(e.target.value) : 0)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading || !canPerformOperations} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
