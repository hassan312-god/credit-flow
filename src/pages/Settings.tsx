import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Bell, 
  Shield, 
  Database, 
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Settings() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Paramètres généraux
  const [companyName, setCompanyName] = useState('N\'FA KA SÉRUM');
  const [currency, setCurrency] = useState('XOF');
  const [language, setLanguage] = useState('fr');
  
  // Paramètres de notification
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');
  
  // Paramètres de sécurité
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [requireStrongPassword, setRequireStrongPassword] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  
  // Paramètres de l'application
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [maxFileSize, setMaxFileSize] = useState('10');

  // Charger les paramètres depuis la base de données
  useEffect(() => {
    const loadSettings = async () => {
      if (role !== 'admin') return;
      
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .order('key');

        if (error) throw error;

        if (data) {
          const settingsMap = new Map(data.map(s => [s.key, s.value]));
          
          // Charger les valeurs
          if (settingsMap.has('company_name')) setCompanyName(settingsMap.get('company_name') as string);
          if (settingsMap.has('currency')) setCurrency(settingsMap.get('currency') as string);
          if (settingsMap.has('language')) setLanguage(settingsMap.get('language') as string);
          if (settingsMap.has('email_notifications')) setEmailNotifications(settingsMap.get('email_notifications') as boolean);
          if (settingsMap.has('payment_reminders')) setPaymentReminders(settingsMap.get('payment_reminders') as boolean);
          if (settingsMap.has('overdue_alerts')) setOverdueAlerts(settingsMap.get('overdue_alerts') as boolean);
          if (settingsMap.has('reminder_days')) {
            const value = settingsMap.get('reminder_days');
            setReminderDays(typeof value === 'number' ? String(value) : String(value || '3'));
          }
          if (settingsMap.has('session_timeout')) {
            const value = settingsMap.get('session_timeout');
            setSessionTimeout(typeof value === 'number' ? String(value) : String(value || '30'));
          }
          if (settingsMap.has('require_strong_password')) setRequireStrongPassword(settingsMap.get('require_strong_password') as boolean);
          if (settingsMap.has('two_factor_auth')) setTwoFactorAuth(settingsMap.get('two_factor_auth') as boolean);
          if (settingsMap.has('auto_backup')) setAutoBackup(settingsMap.get('auto_backup') as boolean);
          if (settingsMap.has('backup_frequency')) setBackupFrequency(settingsMap.get('backup_frequency') as string);
          if (settingsMap.has('max_file_size')) {
            const value = settingsMap.get('max_file_size');
            setMaxFileSize(typeof value === 'number' ? String(value) : String(value || '10'));
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [role]);

  // Vérifier l'accès administrateur
  if (role !== 'admin') {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Seuls les administrateurs peuvent accéder aux paramètres.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const settings = [
        { key: 'company_name', value: companyName },
        { key: 'currency', value: currency },
        { key: 'language', value: language },
        { key: 'email_notifications', value: emailNotifications },
        { key: 'payment_reminders', value: paymentReminders },
        { key: 'overdue_alerts', value: overdueAlerts },
        { key: 'reminder_days', value: reminderDays },
        { key: 'session_timeout', value: sessionTimeout },
        { key: 'require_strong_password', value: requireStrongPassword },
        { key: 'two_factor_auth', value: twoFactorAuth },
        { key: 'auto_backup', value: autoBackup },
        { key: 'backup_frequency', value: backupFrequency },
        { key: 'max_file_size', value: maxFileSize },
      ];

      // Sauvegarder chaque paramètre (upsert)
      for (const setting of settings) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { key: setting.key, value: setting.value },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast.success('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
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
              <SettingsIcon className="w-8 h-8" />
              Paramètres
            </h1>
            <p className="text-muted-foreground mt-2">
              Gérez les paramètres de l'application et configurez les préférences système
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Paramètres généraux */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <CardTitle>Paramètres généraux</CardTitle>
              </div>
              <CardDescription>
                Configurez les informations de base de l'entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nom de l'entreprise</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="USD">USD (Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Paramètres de notification */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Configurez les alertes et notifications du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications par email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rappels de paiement</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les rappels automatiques
                  </p>
                </div>
                <Switch
                  checked={paymentReminders}
                  onCheckedChange={setPaymentReminders}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertes de retard</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifier les retards de paiement
                  </p>
                </div>
                <Switch
                  checked={overdueAlerts}
                  onCheckedChange={setOverdueAlerts}
                />
              </div>
              {paymentReminders && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reminder-days">Jours avant échéance</Label>
                  <Select value={reminderDays} onValueChange={setReminderDays}>
                    <SelectTrigger id="reminder-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 jour</SelectItem>
                      <SelectItem value="3">3 jours</SelectItem>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="15">15 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paramètres de sécurité */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Sécurité</CardTitle>
              </div>
              <CardDescription>
                Paramètres de sécurité et authentification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Délai d'expiration de session (minutes)</Label>
                <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                  <SelectTrigger id="session-timeout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mots de passe forts requis</Label>
                  <p className="text-sm text-muted-foreground">
                    Exiger des mots de passe complexes
                  </p>
                </div>
                <Switch
                  checked={requireStrongPassword}
                  onCheckedChange={setRequireStrongPassword}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer la 2FA pour tous les utilisateurs
                  </p>
                </div>
                <Switch
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>
            </CardContent>
          </Card>

          {/* Paramètres de l'application */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Sauvegarde et données</CardTitle>
              </div>
              <CardDescription>
                Gestion des sauvegardes et des données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Effectuer des sauvegardes automatiques
                  </p>
                </div>
                <Switch
                  checked={autoBackup}
                  onCheckedChange={setAutoBackup}
                />
              </div>
              {autoBackup && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Fréquence de sauvegarde</Label>
                    <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                      <SelectTrigger id="backup-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Toutes les heures</SelectItem>
                        <SelectItem value="daily">Quotidienne</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="max-file-size">Taille maximale des fichiers (MB)</Label>
                <Select value={maxFileSize} onValueChange={setMaxFileSize}>
                  <SelectTrigger id="max-file-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 MB</SelectItem>
                    <SelectItem value="10">10 MB</SelectItem>
                    <SelectItem value="25">25 MB</SelectItem>
                    <SelectItem value="50">50 MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Exporter les données
                </Button>
                <Button variant="outline" className="flex-1">
                  Importer les données
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

