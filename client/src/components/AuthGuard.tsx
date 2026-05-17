import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  message?: string;
}

const IS_LOCAL_DEV = import.meta.env.VITE_APP_ID === "local-dev";

function LocalDevLogin() {
  return (
    <div className="min-h-screen bg-[#0d1a14] flex flex-col items-center justify-center gap-6 text-emerald-100">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-bold text-emerald-400">⚡ VetRank</span>
        <span className="text-xs bg-emerald-900 text-emerald-400 px-3 py-1 rounded-full">
          Ambiente Local de Desenvolvimento
        </span>
      </div>
      <p className="text-sm text-emerald-700">Escolha o perfil para entrar:</p>
      <div className="flex gap-3">
        <a
          href="/api/dev/login?user=admin"
          className="px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
        >
          Admin <span className="text-xs opacity-70 ml-1">premium</span>
        </a>
        <a
          href="/api/dev/login?user=user"
          className="px-6 py-3 bg-cyan-800 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
        >
          Usuário <span className="text-xs opacity-70 ml-1">trial</span>
        </a>
      </div>
    </div>
  );
}

export default function AuthGuard({ children, message }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !IS_LOCAL_DEV) {
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
    if (IS_LOCAL_DEV) return <LocalDevLogin />;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Lock className="h-10 w-10 text-primary/50" />
        <p className="text-sm">{message ?? "Redirecionando para o login..."}</p>
      </div>
    );
  }

  return <>{children}</>;
}
