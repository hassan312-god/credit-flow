# Guide d'utilisation des Deep Links

L'application N'FA KA SÉRUM supporte les deep links pour ouvrir directement des pages spécifiques depuis des liens externes.

## Format des Deep Links

Le protocole personnalisé est : `nfa-ka-serum://`

### Exemples d'utilisation

#### Navigation vers des pages principales
```
nfa-ka-serum://dashboard
nfa-ka-serum://clients
nfa-ka-serum://loans
nfa-ka-serum://payments
nfa-ka-serum://recovery
nfa-ka-serum://reports
nfa-ka-serum://users
nfa-ka-serum://settings
nfa-ka-serum://company-funds
nfa-ka-serum://attendance
```

#### Ouvrir un client spécifique
```
nfa-ka-serum://client/123
```
Ouvre les détails du client avec l'ID 123.

#### Ouvrir un prêt spécifique
```
nfa-ka-serum://loan/456
```
Ouvre les détails du prêt avec l'ID 456.

#### Ouvrir un paiement spécifique
```
nfa-ka-serum://payment/789?loan=456
```
Ouvre le paiement avec l'ID 789, optionnellement filtré par prêt.

#### Créer un nouveau client
```
nfa-ka-serum://clients/new
```

#### Créer un nouveau prêt
```
nfa-ka-serum://loans/new
```

## Utilisation depuis un navigateur

### Windows
1. Créez un fichier `.bat` ou utilisez PowerShell :
```powershell
Start-Process "nfa-ka-serum://dashboard"
```

2. Ou depuis un navigateur web, créez un lien :
```html
<a href="nfa-ka-serum://dashboard">Ouvrir le tableau de bord</a>
```

### Linux
```bash
xdg-open "nfa-ka-serum://dashboard"
```

### macOS
```bash
open "nfa-ka-serum://dashboard"
```

## Utilisation depuis du code

### JavaScript/TypeScript
```javascript
// Ouvrir un client spécifique
window.location.href = 'nfa-ka-serum://client/123';

// Ou utiliser l'API Tauri directement
import { open } from '@tauri-apps/plugin-shell';
await open('nfa-ka-serum://dashboard');
```

### Python
```python
import subprocess
subprocess.run(['nfa-ka-serum://dashboard'], shell=True)
```

### C#
```csharp
System.Diagnostics.Process.Start("nfa-ka-serum://dashboard");
```

## Intégration dans l'application

Le deep linking est géré automatiquement par le composant `DeepLinkHandler` qui :
1. Écoute les deep links au démarrage de l'application
2. Écoute les nouveaux deep links pendant l'exécution
3. Parse l'URL et extrait le chemin et les paramètres
4. Redirige vers la page appropriée
5. Affiche une notification de confirmation

## Pages supportées

- `dashboard` - Tableau de bord
- `clients` - Liste des clients
- `clients/new` - Créer un nouveau client
- `client/:id` - Détails d'un client
- `loans` - Liste des prêts
- `loans/new` - Créer un nouveau prêt
- `loan/:id` - Détails d'un prêt
- `payments` - Liste des paiements
- `payment/:id` - Détails d'un paiement (avec paramètres optionnels)
- `recovery` - Recouvrement
- `reports` - Rapports
- `users` - Utilisateurs
- `settings` - Paramètres
- `company-funds` - Fonds de l'entreprise
- `attendance` - Présence

## Notes importantes

- Les deep links fonctionnent uniquement lorsque l'application est installée
- Sur Windows, le protocole doit être enregistré lors de l'installation
- L'application doit être en cours d'exécution ou s'ouvrir automatiquement lors du clic sur un deep link
- Les paramètres de requête sont supportés : `nfa-ka-serum://payment/123?loan=456`
