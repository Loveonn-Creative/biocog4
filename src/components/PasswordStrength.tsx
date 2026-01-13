import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  test: (pw: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'Contains uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Contains lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Contains a number', test: (pw) => /\d/.test(pw) },
  { label: 'Contains special character', test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

export const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: '' };
  
  const passed = requirements.filter(req => req.test(password)).length;
  
  if (passed <= 1) return { score: 1, label: 'Weak', color: 'bg-destructive' };
  if (passed <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (passed <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (passed <= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-success' };
};

export const isPasswordStrong = (password: string): boolean => {
  return getPasswordStrength(password).score >= 3;
};

export const PasswordStrength = ({ password, showRequirements = true }: PasswordStrengthProps) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passedRequirements = useMemo(
    () => requirements.map(req => ({ ...req, passed: req.test(password) })),
    [password]
  );

  if (!password) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Strength meter */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                level <= strength.score ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs font-medium",
            strength.score <= 2 ? "text-destructive" : 
            strength.score <= 3 ? "text-yellow-600" : "text-success"
          )}>
            {strength.label}
          </span>
          {strength.score < 3 && (
            <span className="text-xs text-destructive">Password too weak</span>
          )}
        </div>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {passedRequirements.map((req, idx) => (
            <li 
              key={idx}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                req.passed ? "text-success" : "text-muted-foreground"
              )}
            >
              {req.passed ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
