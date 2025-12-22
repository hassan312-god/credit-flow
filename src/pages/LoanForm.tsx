import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { OperationBlocked } from '@/components/OperationBlocked';
import { useWorkSession } from '@/hooks/useWorkSession';

const loanSchema = z.object({
  client_id: z.string().uuid('Veuillez sélectionner un client'),
  amount: z.number().min(10000, 'Le montant minimum est de 10 000 FCFA'),
  interest_rate: z.number().min(0).max(100),
  duration_months: z.number().min(1).max(60),
  purpose: z.string().max(500).optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

export default function LoanForm() {
  const navigate = useNavigate();
  const { canPerformOperations } = useWorkSession();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof LoanFormData, string>>>({});
  const [formData, setFormData] = useState<LoanFormData>({
    client_id: '',
    amount: 0,
    interest_rate: 10,
    duration_months: 12,
    purpose: '',
  });

  // Calculated values
  const totalInterest = (formData.amount * formData.interest_rate * formData.duration_months) / 100 / 12;
  const totalAmount = formData.amount + totalInterest;
  const monthlyPayment = formData.duration_months > 0 ? totalAmount / formData.duration_months : 0;

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, full_name, phone')
        .order('full_name');
      setClients(data || []);
    };
    fetchClients();
  }, []);

  const handleChange = (field: keyof LoanFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const validatedData = loanSchema.parse(formData);

      const { error } = await supabase.from('loans').insert({
        client_id: validatedData.client_id,
        amount: validatedData.amount,
        interest_rate: validatedData.interest_rate,
        duration_months: validatedData.duration_months,
        monthly_payment: Math.round(monthlyPayment),
        total_amount: Math.round(totalAmount),
        purpose: validatedData.purpose || null,
        status: 'en_attente',
      });

      if (error) throw error;

      toast.success('Demande de prêt créée avec succès');
      navigate('/loans');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof LoanFormData, string>> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoanFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error('Erreur lors de la création du prêt');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <OperationBlocked operation="créer un prêt" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-3xl font-bold">Nouveau Prêt</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Détails du prêt</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Client *</Label>
                    <Select value={formData.client_id} onValueChange={(v) => handleChange('client_id', v)}>
                      <SelectTrigger className={errors.client_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Montant (FCFA) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount || ''}
                        onChange={(e) => handleChange('amount', Number(e.target.value))}
                        placeholder="100000"
                        className={errors.amount ? 'border-destructive' : ''}
                      />
                      {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interest_rate">Taux d'intérêt (%) *</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.5"
                        value={formData.interest_rate}
                        onChange={(e) => handleChange('interest_rate', Number(e.target.value))}
                        className={errors.interest_rate ? 'border-destructive' : ''}
                      />
                      {errors.interest_rate && <p className="text-sm text-destructive">{errors.interest_rate}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration_months">Durée (mois) *</Label>
                      <Select 
                        value={String(formData.duration_months)} 
                        onValueChange={(v) => handleChange('duration_months', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 6, 9, 12, 18, 24, 36, 48, 60].map(m => (
                            <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Objet du prêt</Label>
                    <Textarea
                      id="purpose"
                      value={formData.purpose}
                      onChange={(e) => handleChange('purpose', e.target.value)}
                      placeholder="Décrivez l'objet du prêt..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={loading || !canPerformOperations} className="gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Soumettre
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Simulation */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capital</span>
                  <span className="font-medium">{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Intérêts</span>
                  <span className="font-medium">{formatCurrency(totalInterest)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium">Total à rembourser</span>
                  <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Mensualité</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyPayment)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  pendant {formData.duration_months} mois
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
