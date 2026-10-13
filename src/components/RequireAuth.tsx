import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStatus } from '@/hooks/useSession';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Waits for the stored sign-in to rehydrate before deciding anything, so a
 * hard refresh never bounces a signed-in user back to sign-in. It does not
 * wait for the guest session, so a signed-out visitor is redirected at once.
 * The intended path is remembered and restored after a successful sign-in.
 */
export const RequireAuth = ({ children }: RequireAuthProps) => {
  const status = useAuthStatus();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary reveal-after-delay" />
      </div>
    );
  }

  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <>{children}</>;
};
