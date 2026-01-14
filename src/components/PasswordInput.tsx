import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  iconClassName?: string;
}

export function PasswordInput({
  className,
  wrapperClassName,
  iconClassName,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
          iconClassName
        )}
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="sr-only">
          {showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        </span>
      </Button>
    </div>
  );
}
