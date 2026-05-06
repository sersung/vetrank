import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Gift, Users, CheckCircle2, Clock, Copy, Share2,
  Trophy, Mail, ChevronRight, Star, Zap,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", registered: "Cadastrado", paid: "Pago", expired: "Expirado",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  registered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expired: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Referrals() {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: myCode, isLoading: loadingCode } = trpc.referrals.getMyCode.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: myReferrals, isLoading: loadingReferrals } = trpc.referrals.getMyReferrals.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  const sendInviteMutation = trpc.referrals.sendInvite.useMutation({
    onSuccess: () => {
      toast.success("Indicação registrada com sucesso!");
      setInviteEmail("");
      utils.referrals.getMyReferrals.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const referralLink = myCode?.code
    ? `${window.location.origin}/register?ref=${myCode.code}`
    : "";

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "VetRank – Plataforma de estudos para veterinários",
        text: "Estou estudando para o CFMV no VetRank! Use meu link para se cadastrar:",
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Gift className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Programa de Indicações</h2>
            <p className="text-muted-foreground mb-6">
              Indique 10 amigos que se tornarem assinantes e ganhe 1 ano gratuito no VetRank!
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Fazer login para participar</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Programa de Indicações</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Indique colegas veterinários. Quando 10 deles assinarem um plano pago, você ganha 1 ano gratuito!
          </p>
        </div>

        {/* Bonus Active Banner */}
        {myCode?.bonusActive && (
          <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Trophy className="h-8 w-8 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-amber-400">Bônus Ativo!</p>
                <p className="text-sm text-muted-foreground">
                  Seu plano anual gratuito está ativo
                  {myCode.bonusExpiresAt && ` até ${new Date(myCode.bonusExpiresAt).toLocaleDateString("pt-BR")}`}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Seu Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCode ? (
              <div className="h-20 animate-pulse bg-muted rounded" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-primary">{myCode?.paidCount ?? 0}</span>
                  <span className="text-muted-foreground mb-1">/ {myCode?.threshold ?? 10} indicações pagas</span>
                </div>
                <Progress value={myCode?.progressPercent ?? 0} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{myCode?.pendingCount ?? 0} pendentes (aguardando pagamento)</span>
                  <span className="font-medium text-primary">{myCode?.progressPercent ?? 0}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Faltam <strong className="text-foreground">{Math.max(0, (myCode?.threshold ?? 10) - (myCode?.paidCount ?? 0))}</strong> indicações pagas para ganhar 1 ano gratuito.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Seu Link de Indicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" onClick={handleCopyLink} className="gap-1 shrink-0">
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button onClick={handleShare} className="gap-1 shrink-0">
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Quando alguém se cadastrar usando seu link e assinar um plano pago, a indicação é contabilizada automaticamente.
            </p>
          </CardContent>
        </Card>

        {/* Send Invite by Email */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Indicar por Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && inviteEmail && sendInviteMutation.mutate({ email: inviteEmail })}
              />
              <Button
                onClick={() => sendInviteMutation.mutate({ email: inviteEmail })}
                disabled={!inviteEmail || sendInviteMutation.isPending}
                className="shrink-0"
              >
                {sendInviteMutation.isPending ? "Enviando..." : "Indicar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Registre o email do colega que você indicou. A indicação só conta após o pagamento do plano.
            </p>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card className="mb-6 bg-muted/30">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Como funciona
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                Compartilhe seu link ou registre o email do colega que você indicou.
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                O colega se cadastra e assina um plano mensal ou anual (não conta período de teste gratuito).
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                A indicação é confirmada automaticamente após o pagamento ser processado.
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                Ao atingir 10 indicações pagas, você ganha 1 ano de acesso gratuito ao VetRank Premium.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* My Referrals List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Minhas Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReferrals ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-muted rounded" />)}
              </div>
            ) : !myReferrals || myReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma indicação ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compartilhe seu link para começar!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(myReferrals as Array<{
                  id: number; referredEmail: string; status: string;
                  paidAt: Date | null; planPurchased: string | null; createdAt: Date;
                }>).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.referredEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        Indicado em {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                        {r.paidAt && ` · Pago em ${new Date(r.paidAt).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? ""}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
