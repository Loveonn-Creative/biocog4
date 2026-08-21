import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Waits for the stored session to rehydrate before deciding anything, so a
 * hard refresh never bounces a signed-in user back to sign-in. When the user
 * is genuinely signed out, the intended path is remembered and restored after
 * a successful sign-in.
 */
export const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <>{children}</>;
};
