import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles, Zap, CreditCard, Shield } from "lucide-react";
import { useState } from "react";

export default function Pricing() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(null);

  const { data: planStatus } = trpc.payment.myPlan.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const startTrial = trpc.payment.startTrial.useMutation();
  const createPreference = trpc.payment.createPreference.useMutation();
  const utils = trpc.useUtils();

  const handleStartTrial = async () => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    try {
      await startTrial.mutateAsync();
      toast.success(language === "pt" ? "Trial premium ativado por 30 dias! 🎉" : "Premium trial activated for 30 days! 🎉");
      utils.payment.myPlan.invalidate();
    } catch (err: any) {
      toast.error(err.message || (language === "pt" ? "Erro ao ativar trial." : "Error activating trial."));
    }
  };

  const handleCheckout = async (plan: "monthly" | "annual") => {
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
    setLoadingPlan(plan);
    try {
      const origin = window.location.origin;
      const result = await createPreference.mutateAsync({
        plan,
        successUrl: `${origin}/payment/success`,
        failureUrl: `${origin}/payment/failure`,
        pendingUrl: `${origin}/payment/pending`,
      });
      // Redirect to Mercado Pago checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.message || (language === "pt" ? "Erro ao iniciar pagamento." : "Error starting payment."));
      setLoadingPlan(null);
    }
  };

  const isPremium = planStatus?.isPremiumActive;
  const isTrial = planStatus?.isTrialActive;
  const hasUsedTrial = planStatus?.trialEndsAt != null;

  const freePlanFeatures = language === "pt"
    ? ["30 questões gratuitas por mês", "Banco de questões com filtros", "Perfil gamificado básico", "Ranking geral"]
    : ["30 free questions per month", "Question bank with filters", "Basic gamified profile", "General ranking"];

  const monthlyFeatures = language === "pt"
    ? ["Questões ilimitadas de todas as disciplinas", "Simulados ilimitados com timer", "Ranking semanal e mensal", "Explicações com IA (Gemini)", "10 badges desbloqueáveis", "Histórico completo de simulados", "Suporte prioritário"]
    : ["Unlimited questions from all disciplines", "Unlimited exams with timer", "Weekly and monthly ranking", "AI explanations (Gemini)", "10 unlockable badges", "Full exam history", "Priority support"];

  const annualFeatures = language === "pt"
    ? [...monthlyFeatures, "37% de desconto vs. mensalidade", "Acesso antecipado a novos recursos"]
    : [...monthlyFeatures, "37% discount vs. monthly plan", "Early access to new features"];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/15 text-primary border-primary/30">
            {language === "pt" ? "Planos & Preços" : "Plans & Pricing"}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Playfair Display, serif" }}>
            {language === "pt" ? "Invista no seu futuro" : "Invest in your future"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {language === "pt"
              ? "Comece gratuitamente e faça upgrade quando estiver pronto. Trial premium de 30 dias sem cartão de crédito."
              : "Start for free and upgrade when you're ready. 30-day premium trial with no credit card required."}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Free Plan */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
                  {language === "pt" ? "Gratuito" : "Free"}
                </h2>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>R$0</span>
                <span className="text-muted-foreground text-sm">/{language === "pt" ? "sempre" : "forever"}</span>
              </div>
              <p className="text-muted-foreground text-sm">{language === "pt" ? "Para começar sua jornada" : "To start your journey"}</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {freePlanFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full bg-transparent"
              onClick={() => !isAuthenticated && (window.location.href = getLoginUrl())}
              disabled={isAuthenticated && !isPremium}>
              {isAuthenticated
                ? isPremium ? (language === "pt" ? "Fazer Downgrade" : "Downgrade") : (language === "pt" ? "Plano Atual" : "Current Plan")
                : (language === "pt" ? "Começar Grátis" : "Start Free")}
            </Button>
          </div>

          {/* Premium Monthly */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h2 className="text-xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>Premium</h2>
                <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                  {language === "pt" ? "Mensal" : "Monthly"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>R$39</span>
                <span className="text-2xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>,90</span>
                <span className="text-muted-foreground text-sm">/{language === "pt" ? "mês" : "month"}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {language === "pt" ? "Flexibilidade total, cancele quando quiser" : "Full flexibility, cancel anytime"}
              </p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {monthlyFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
            {isPremium && !isTrial ? (
              <Button disabled className="w-full bg-primary/20 text-primary gap-2">
                <Crown className="h-4 w-4" /> {language === "pt" ? "Plano Ativo" : "Active Plan"}
              </Button>
            ) : (
              <div className="space-y-3">
                {!hasUsedTrial && (
                  <>
                    <Button variant="outline"
                      className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 bg-transparent"
                      onClick={handleStartTrial}
                      disabled={startTrial.isPending || isTrial}>
                      {startTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      {isTrial
                        ? (language === "pt" ? "Trial Ativo" : "Trial Active")
                        : (language === "pt" ? "Iniciar Trial Grátis (30 dias)" : "Start Free Trial (30 days)")}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">✓ {language === "pt" ? "Sem cartão de crédito" : "No credit card required"}</p>
                    <div className="flex items-center gap-2 text-muted-foreground/50 text-xs justify-center">
                      <span>—</span><span>{language === "pt" ? "ou assine agora" : "or subscribe now"}</span><span>—</span>
                    </div>
                  </>
                )}
                <Button className="w-full gap-2 bg-card border border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => handleCheckout("monthly")}
                  disabled={loadingPlan === "monthly"}>
                  {loadingPlan === "monthly" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {language === "pt" ? "Assinar por R$39,90/mês" : "Subscribe R$39.90/month"}
                </Button>
              </div>
            )}
          </div>

          {/* Premium Annual — HIGHLIGHT */}
          <div className="relative bg-card border-2 border-primary/50 rounded-2xl p-8 flex flex-col shadow-xl shadow-primary/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-lg">
                <Sparkles className="h-3 w-3 mr-1" />
                {language === "pt" ? "Melhor Custo-Benefício" : "Best Value"}
              </Badge>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h2 className="text-xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>Premium</h2>
                <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                  {language === "pt" ? "Anual" : "Annual"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-primary" style={{ fontFamily: "Playfair Display, serif" }}>R$299</span>
                <span className="text-muted-foreground text-sm">/{language === "pt" ? "ano" : "year"}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-primary font-semibold">
                  {language === "pt" ? "≈ R$24,90/mês" : "≈ R$24.90/month"}
                </span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs px-2">37% OFF</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="line-through text-muted-foreground/60">
                  {language === "pt" ? "R$478,80/ano (mensal)" : "R$478.80/year (monthly)"}
                </span>
                {" "}→{" "}
                <span className="text-emerald-400 font-semibold">
                  {language === "pt" ? "Economize R$179,80" : "Save R$179.80"}
                </span>
              </p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {annualFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
            {isPremium && !isTrial ? (
              <Button disabled className="w-full bg-primary text-primary-foreground gap-2">
                <Crown className="h-4 w-4" /> {language === "pt" ? "Plano Ativo" : "Active Plan"}
              </Button>
            ) : (
              <div className="space-y-3">
                {!hasUsedTrial && (
                  <>
                    <Button variant="outline"
                      className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 bg-transparent"
                      onClick={handleStartTrial}
                      disabled={startTrial.isPending || isTrial}>
                      {startTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      {isTrial
                        ? (language === "pt" ? "Trial Ativo" : "Trial Active")
                        : (language === "pt" ? "Iniciar Trial Grátis (30 dias)" : "Start Free Trial (30 days)")}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">✓ {language === "pt" ? "Sem cartão de crédito" : "No credit card required"}</p>
                    <div className="flex items-center gap-2 text-muted-foreground/50 text-xs justify-center">
                      <span>—</span><span>{language === "pt" ? "ou assine agora" : "or subscribe now"}</span><span>—</span>
                    </div>
                  </>
                )}
                <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                  onClick={() => handleCheckout("annual")}
                  disabled={loadingPlan === "annual"}>
                  {loadingPlan === "annual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {language === "pt" ? "Assinar por R$299/ano" : "Subscribe R$299/year"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  ✓ {language === "pt" ? "Sem cartão de crédito · ✓ Cancele quando quiser" : "No credit card · ✓ Cancel anytime"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment security note */}
        <div className="flex items-center justify-center gap-2 mt-10 text-muted-foreground text-sm">
          <Shield className="w-4 h-4 text-primary" />
          <span>
            {language === "pt"
              ? "Pagamento seguro processado pelo Mercado Pago. Seus dados estão protegidos."
              : "Secure payment processed by Mercado Pago. Your data is protected."}
          </span>
        </div>
      </div>
    </div>
  );
}
