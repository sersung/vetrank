import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Crown,
  Download,
  Loader2,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useRef } from "react";

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusConfig(status: string) {
  switch (status) {
    case "active":
      return {
        label: "Premium Ativo",
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        icon: <Crown className="h-4 w-4" />,
        desc: "Você tem acesso completo a todos os recursos da plataforma.",
      };
    case "trial":
      return {
        label: "Trial Ativo",
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: <Clock className="h-4 w-4" />,
        desc: "Você está no período de avaliação gratuita.",
      };
    case "expired":
      return {
        label: "Plano Expirado",
        color: "bg-red-500/20 text-red-400 border-red-500/30",
        icon: <XCircle className="h-4 w-4" />,
        desc: "Seu plano expirou. Renove para continuar com acesso completo.",
      };
    default:
      return {
        label: "Plano Free",
        color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
        icon: <Zap className="h-4 w-4" />,
        desc: "Acesso limitado. Assine um plano para desbloquear todos os recursos.",
      };
  }
}

function paymentStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    approved: { label: "Aprovado", color: "text-emerald-400" },
    pending: { label: "Pendente", color: "text-amber-400" },
    rejected: { label: "Recusado", color: "text-red-400" },
    cancelled: { label: "Cancelado", color: "text-zinc-400" },
    refunded: { label: "Reembolsado", color: "text-purple-400" },
  };
  return map[status] ?? { label: status, color: "text-muted-foreground" };
}

// ─── Receipt printer ──────────────────────────────────────────────────────────
function printReceipt(data: {
  userName: string | null;
  userEmail: string | null;
  amount: number;
  planType: string | null;
  paymentMethod: string | null;
  createdAt: Date | string;
  status: string;
}) {
  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Recibo VetRank</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 480px; margin: 40px auto; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 28px; font-weight: bold; letter-spacing: -1px; }
        .subtitle { font-size: 13px; color: #555; margin-top: 4px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .label { color: #555; }
        .value { font-weight: 500; }
        .total { border-top: 1px solid #ddd; padding-top: 12px; margin-top: 12px; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">⚡ VetRank</div>
        <div class="subtitle">Plataforma de Preparação para Medicina Veterinária</div>
      </div>
      <div class="row"><span class="label">Cliente</span><span class="value">${data.userName ?? "—"}</span></div>
      <div class="row"><span class="label">E-mail</span><span class="value">${data.userEmail ?? "—"}</span></div>
      <div class="row"><span class="label">Plano</span><span class="value">${data.planType === "annual" ? "Anual" : "Mensal"}</span></div>
      <div class="row"><span class="label">Método de pagamento</span><span class="value">${data.paymentMethod ?? "—"}</span></div>
      <div class="row"><span class="label">Data</span><span class="value">${new Date(data.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
      <div class="row"><span class="label">Status</span><span class="badge">✓ ${data.status === "approved" ? "Pagamento Aprovado" : data.status}</span></div>
      <div class="row total"><span>Total</span><span>R$ ${Number(data.amount).toFixed(2).replace(".", ",")}</span></div>
      <div class="footer">
        Este recibo é gerado automaticamente pela plataforma VetRank.<br/>
        Para suporte: contato@vetrank.com.br
      </div>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(receiptHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MySubscription() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = trpc.plans.mySubscription.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Faça login para ver sua assinatura.</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Entrar</Button>
      </div>
    );
  }

  if (!data) return null;

  const cfg = statusConfig(data.status);
  const pay = data.lastPayment as any;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Minha Assinatura</h1>
          <p className="text-muted-foreground mt-1 font-sans text-sm">Gerencie seu plano e histórico de pagamentos.</p>
        </div>

        {/* Status card */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${cfg.color}`}>{cfg.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-xl font-bold text-foreground">{cfg.label}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-sans">{cfg.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {data.status === "trial" && data.trialEndsAt && (
              <div className="rounded-lg bg-muted/20 p-3 border border-border/30">
                <div className="text-xs text-muted-foreground font-sans mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Trial expira em</div>
                <div className="font-medium text-foreground">{data.trialDays} dias</div>
                <div className="text-xs text-muted-foreground">{new Date(data.trialEndsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
              </div>
            )}
            {data.status === "active" && data.premiumEndsAt && (
              <div className="rounded-lg bg-muted/20 p-3 border border-border/30">
                <div className="text-xs text-muted-foreground font-sans mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Assinatura válida até</div>
                <div className="font-medium text-foreground">{data.premiumDays} dias restantes</div>
                <div className="text-xs text-muted-foreground">{new Date(data.premiumEndsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
              </div>
            )}
            {data.subscriptionPlan && (
              <div className="rounded-lg bg-muted/20 p-3 border border-border/30">
                <div className="text-xs text-muted-foreground font-sans mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Tipo de plano</div>
                <div className="font-medium text-foreground capitalize">{data.subscriptionPlan === "annual" ? "Anual" : "Mensal"}</div>
              </div>
            )}
          </div>

          {(data.status === "free" || data.status === "expired") && (
            <div className="pt-2">
              <Button className="gap-2" onClick={() => navigate("/planos")}>
                <Crown className="h-4 w-4" /> Assinar Premium
              </Button>
            </div>
          )}
        </div>

        {/* Last payment card */}
        {pay ? (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-foreground">Último Pagamento</h2>
              {pay.status === "approved" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => printReceipt({ ...pay, userName: data.user.name, userEmail: data.user.email })}>
                  <Download className="h-3.5 w-3.5" /> Recibo
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground font-sans">Valor</div>
                <div className="font-semibold text-foreground text-lg">R$ {Number(pay.amount).toFixed(2).replace(".", ",")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-sans">Plano</div>
                <div className="font-medium text-foreground capitalize">{pay.planType === "annual" ? "Anual" : "Mensal"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-sans">Método</div>
                <div className="font-medium text-foreground capitalize">{pay.paymentMethod ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-sans">Data</div>
                <div className="font-medium text-foreground">{new Date(pay.createdAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-sans">Status</div>
                <div className={`font-medium ${paymentStatusLabel(pay.status).color}`}>{paymentStatusLabel(pay.status).label}</div>
              </div>
            </div>

            {pay.status === "rejected" && pay.failureReason && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex gap-2">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-400">Pagamento recusado</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{pay.failureReason}</div>
                </div>
              </div>
            )}

            {pay.status === "approved" && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-400">Pagamento confirmado. Obrigado por assinar o VetRank!</div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center text-muted-foreground font-sans text-sm">
            Nenhum pagamento registrado ainda.
          </div>
        )}

        {/* Back button */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground">
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
