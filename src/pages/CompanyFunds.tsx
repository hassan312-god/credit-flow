import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wallet, 
  Save, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  History,
  DollarSign,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { exportToPDF, exportToXLSX } from '@/utils/exportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CompanyFund {
  id: string;
  initial_capital: number;
  current_balance: number;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface FundHistory {
  id: string;
  previous_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: string;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
}

export default function CompanyFunds() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fund, setFund] = useState<CompanyFund | null>(null);
  const [history, setHistory] = useState<FundHistory[]>([]);
  const [initialCapital, setInitialCapital] = useState<string>('0');
  const [currentBalance, setCurrentBalance] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Vérifier l'accès
  const canManageFunds = role === 'admin' || role === 'directeur';

  useEffect(() => {
    if (!canManageFunds) return;
    loadFundData();
  }, [canManageFunds]);

  const loadFundData = async () => {
    setLoadingData(true);
    try {
      // Charger le fond actuel
      const { data: fundData, error: fundError } = await supabase
        .from('company_funds' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fundError) throw fundError;

      if (fundData) {
        setFund(fundData as unknown as CompanyFund);
        setInitialCapital((fundData as any).initial_capital.toString());
        setCurrentBalance((fundData as any).current_balance.toString());
        setNotes((fundData as any).notes || '');
      } else {
        // Créer un fond initial si aucun n'existe
        const { data: newFund, error: createError } = await supabase
          .from('company_funds' as any)
          .insert({
            initial_capital: 0,
            current_balance: 0,
            notes: 'Fond initial de l\'entreprise',
            updated_by: user?.id || null,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newFund) {
          setFund(newFund as unknown as CompanyFund);
          setInitialCapital('0');
          setCurrentBalance('0');
          setNotes('Fond initial de l\'entreprise');
        }
      }

      // Charger l'historique
      if (fundData) {
        const { data: historyData, error: historyError } = await supabase
          .from('company_funds_history' as any)
          .select('*')
          .eq('fund_id', (fundData as any).id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (historyError) throw historyError;
        setHistory((historyData || []) as unknown as FundHistory[]);
      }
    } catch (error: any) {
      console.error('Error loading fund data:', error);
      toast.error('Erreur lors du chargement des données du fond');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!fund) return;

    setLoading(true);
    try {
      const initialCapitalNum = parseFloat(initialCapital.replace(/\s/g, '').replace(',', '.'));
      const currentBalanceNum = parseFloat(currentBalance.replace(/\s/g, '').replace(',', '.'));

      if (isNaN(initialCapitalNum) || initialCapitalNum < 0) {
        toast.error('Le capital initial doit être un nombre valide et positif');
        return;
      }

      if (isNaN(currentBalanceNum) || currentBalanceNum < 0) {
        toast.error('Le solde actuel doit être un nombre valide et positif');
        return;
      }

      const previousBalance = fund.current_balance;
      const changeAmount = currentBalanceNum - previousBalance;
      const changeType = previousBalance === 0 && currentBalanceNum > 0 ? 'initial_setup' : 'adjustment';

      // Mettre à jour le fond
      const { data: updatedFund, error: updateError } = await supabase
        .from('company_funds' as any)
        .update({
          initial_capital: initialCapitalNum,
          current_balance: currentBalanceNum,
          notes: notes || null,
          updated_by: user?.id || null,
        })
        .eq('id', fund.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Enregistrer dans l'historique si le solde a changé
      if (changeAmount !== 0) {
        const { error: historyError } = await supabase
          .from('company_funds_history' as any)
          .insert({
            fund_id: fund.id,
            previous_balance: previousBalance,
            new_balance: currentBalanceNum,
            change_amount: changeAmount,
            change_type: changeType,
            notes: notes || null,
            updated_by: user?.id || null,
          });

        if (historyError) {
          console.error('Error saving history:', historyError);
          // Ne pas bloquer la mise à jour si l'historique échoue
        }
      }

      setFund(updatedFund as unknown as CompanyFund);
      toast.success('Fond de l\'entreprise mis à jour avec succès');
      loadFundData(); // Recharger pour avoir l'historique à jour
    } catch (error: any) {
      console.error('Error saving fund:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde du fond');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial_setup: 'Configuration initiale',
      adjustment: 'Ajustement',
      loan_disbursement: 'Décaissement de prêt',
      payment_received: 'Paiement reçu',
    };
    return labels[type] || type;
  };

  if (!canManageFunds) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs et les directeurs peuvent gérer le fond de l'entreprise.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (loadingData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              Gestion du fond de l'entreprise
            </h1>
            <p className="text-muted-foreground mt-2">
              Définissez et gérez le capital initial et le solde actuel de l'entreprise
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Masquer' : 'Afficher'} l'historique
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistiques */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Solde actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {fund ? formatCurrency(fund.current_balance) : formatCurrency(0)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Capital initial: {fund ? formatCurrency(fund.initial_capital) : formatCurrency(0)}
              </p>
            </CardContent>
          </Card>

          {/* Formulaire de gestion */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Paramètres du fond</CardTitle>
              <CardDescription>
                Modifiez le capital initial et le solde actuel de l'entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="initial-capital">Capital initial (XOF)</Label>
                <Input
                  id="initial-capital"
                  type="text"
                  value={initialCapital}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,.-]/g, '');
                    setInitialCapital(value);
                  }}
                  placeholder="0"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Montant: {formatCurrency(parseFloat(initialCapital.replace(/\s/g, '').replace(',', '.')) || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-balance">Solde actuel (XOF)</Label>
                <Input
                  id="current-balance"
                  type="text"
                  value={currentBalance}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,.-]/g, '');
                    setCurrentBalance(value);
                  }}
                  placeholder="0"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Montant: {formatCurrency(parseFloat(currentBalance.replace(/\s/g, '').replace(',', '.')) || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur cette modification..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historique */}
        {showHistory && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historique des modifications
                  </CardTitle>
                  <CardDescription>
                    Liste des changements apportés au fond de l'entreprise
                  </CardDescription>
                </div>
                {history.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const headers = ['Date', 'Type', 'Solde précédent', 'Nouveau solde', 'Variation', 'Notes'];
                        const rows = history.map(entry => [
                          formatDate(entry.created_at),
                          getChangeTypeLabel(entry.change_type),
                          formatCurrency(entry.previous_balance),
                          formatCurrency(entry.new_balance),
                          formatCurrency(entry.change_amount),
                          entry.notes || '-',
                        ]);
                        exportToPDF(rows, headers, `historique-fond-${format(new Date(), 'yyyy-MM-dd')}`, 'Historique du fond de l\'entreprise');
                      }}>
                        <FileText className="w-4 h-4 mr-2" />
                        Exporter en PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const headers = ['Date', 'Type', 'Solde précédent', 'Nouveau solde', 'Variation', 'Notes'];
                        const rows = history.map(entry => [
                          formatDate(entry.created_at),
                          getChangeTypeLabel(entry.change_type),
                          formatCurrency(entry.previous_balance),
                          formatCurrency(entry.new_balance),
                          formatCurrency(entry.change_amount),
                          entry.notes || '-',
                        ]);
                        exportToXLSX(rows, headers, `historique-fond-${format(new Date(), 'yyyy-MM-dd')}`, 'Historique');
                      }}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Exporter en Excel (XLSX)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Solde précédent</TableHead>
                      <TableHead>Nouveau solde</TableHead>
                      <TableHead>Variation</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
                            {entry.change_type === 'initial_setup' && <TrendingUp className="w-3 h-3" />}
                            {entry.change_type === 'adjustment' && (
                              entry.change_amount > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              )
                            )}
                            {getChangeTypeLabel(entry.change_type)}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(entry.previous_balance)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(entry.new_balance)}
                        </TableCell>
                        <TableCell
                          className={`font-medium ${
                            entry.change_amount > 0
                              ? 'text-green-600'
                              : entry.change_amount < 0
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {entry.change_amount > 0 ? '+' : ''}
                          {formatCurrency(entry.change_amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {entry.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun historique disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

