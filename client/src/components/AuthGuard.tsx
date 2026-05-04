import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Optional message shown briefly before redirect */
  message?: string;
}

/**
 * Wraps any page that requires authentication.
 * - While auth state is loading: shows a skeleton.
 * - If unauthenticated: redirects to Manus OAuth login immediately.
 * - If authenticated: renders children.
 */
export default function AuthGuard({ children, message }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Encode current path so OAuth can return here after login
      // Store return path in sessionStorage so we can redirect back after login
      sessionStorage.setItem("returnPath", window.location.pathname + window.location.search);
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full max-w-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show a brief locked state while redirect happens
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Lock className="h-10 w-10 text-primary/50" />
        <p className="text-sm">{message ?? "Redirecionando para o login..."}</p>
      </div>
    );
  }

  return <>{children}</>;
}
