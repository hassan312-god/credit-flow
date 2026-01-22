import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/PasswordInput';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Lock, Ban, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [suspensionInfo, setSuspensionInfo] = useState<{ suspended_until: string; reason: string | null } | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    setSuspensionInfo(null);
    
    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      setIsLoading(false);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error('Erreur de connexion. Veuillez réessayer.');
      }
      return;
    }

    // Check if user is suspended
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        // Continue with login even if session check fails
      }
      
      if (sessionData?.session?.user) {
        const userId = sessionData.session.user.id;
        
        // Use the database function to check suspension
        const { data: suspensionData, error: suspError } = await supabase
          .rpc('get_user_suspension', { _user_id: userId });

        if (suspError) {
          console.error('Error checking suspension:', suspError);
          // Continue with login if suspension check fails
        } else if (suspensionData && suspensionData.length > 0) {
          // User is suspended - sign them out immediately
          await supabase.auth.signOut();
          setSuspensionInfo(suspensionData[0]);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user suspension:', error);
      // Continue with login if suspension check fails
    }

    setIsLoading(false);
    toast.success('Connexion réussie !');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !z.string().email().safeParse(resetEmail).success) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Erreur lors de l\'envoi de l\'email');
        setIsResetting(false);
        return;
      }

      setResetEmailSent(true);
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsResetting(false);
    }
  };

  const closeForgotPasswordDialog = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetEmailSent(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
        <div>
          {/* Logo officiel N'FA KA SÉRUM - En haut à gauche */}
          <div className="mb-8">
            <img 
              src="https://rrgbccnkkarwasrmfnmc.supabase.co/storage/v1/object/public/Logo/lo.png"
              alt="N'FA KA SÉRUM - Logo officiel"
              className="w-48 h-48 object-contain drop-shadow-lg"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
            Gérez vos prêts avec <span className="text-accent">simplicité</span> et <span className="text-accent">efficacité</span>
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Une solution complète pour la gestion des crédits, le suivi des remboursements et le recouvrement.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="p-4 rounded-xl bg-primary-foreground/10 backdrop-blur">
            <p className="text-3xl font-display font-bold text-primary-foreground">500+</p>
            <p className="text-sm text-primary-foreground/70">Prêts gérés</p>
          </div>
          <div className="p-4 rounded-xl bg-primary-foreground/10 backdrop-blur">
            <p className="text-3xl font-display font-bold text-primary-foreground">98%</p>
            <p className="text-sm text-primary-foreground/70">Taux de recouvrement</p>
          </div>
          <div className="p-4 rounded-xl bg-primary-foreground/10 backdrop-blur">
            <p className="text-3xl font-display font-bold text-primary-foreground">24h</p>
            <p className="text-sm text-primary-foreground/70">Délai de traitement</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border shadow-lg animate-fade-in">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex flex-col items-center justify-center gap-2 mb-6">
              <img 
                src="https://rrgbccnkkarwasrmfnmc.supabase.co/storage/v1/object/public/Logo/ChatGPT_Image_24_nov._2025__14_25_29-removebg-preview.png"
                alt="N'FA KA SÉRUM - Logo officiel"
                className="w-32 h-32 object-contain"
              />
            </div>
            <CardTitle className="font-display text-2xl">Bienvenue</CardTitle>
            <CardDescription>Connectez-vous pour accéder à votre espace</CardDescription>
          </CardHeader>
          <CardContent>
            {suspensionInfo && (
              <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <Ban className="w-5 h-5" />
                  <span className="font-semibold">Compte suspendu</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Votre compte est suspendu jusqu'au{' '}
                  <span className="font-medium text-foreground">
                    {format(new Date(suspensionInfo.suspended_until), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </p>
                {suspensionInfo.reason && (
                  <p className="text-sm text-muted-foreground">
                    Raison : <span className="text-foreground">{suspensionInfo.reason}</span>
                  </p>
                )}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="input-label">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="input-label">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <PasswordInput
                    id="login-password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm text-muted-foreground hover:text-primary"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Mot de passe oublié ?
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            {/* Forgot Password Dialog */}
            <Dialog open={forgotPasswordOpen} onOpenChange={closeForgotPasswordDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    {resetEmailSent ? 'Email envoyé !' : 'Réinitialiser le mot de passe'}
                  </DialogTitle>
                  <DialogDescription>
                    {resetEmailSent 
                      ? 'Vérifiez votre boîte de réception pour le lien de réinitialisation.'
                      : 'Entrez votre adresse email pour recevoir un lien de réinitialisation.'
                    }
                  </DialogDescription>
                </DialogHeader>
                
                {resetEmailSent ? (
                  <div className="space-y-4">
                    <div className="flex justify-center py-4">
                      <CheckCircle className="w-16 h-16 text-green-500" />
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      Un email a été envoyé à <span className="font-medium text-foreground">{resetEmail}</span>. 
                      Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={closeForgotPasswordDialog}
                    >
                      Fermer
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Adresse email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="votre@email.com"
                          className="pl-10"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={closeForgotPasswordDialog}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isResetting}>
                        {isResetting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          'Envoyer le lien'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
