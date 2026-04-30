import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Check, Crown, Loader2, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Pricing() {
  const t = useT();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: planStatus } = trpc.subscription.myPlan.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const startTrial = trpc.subscription.startTrial.useMutation();
  const utils = trpc.useUtils();

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    try {
      await startTrial.mutateAsync();
      toast.success(language === "pt" ? "Trial premium ativado por 30 dias! 🎉" : "Premium trial activated for 30 days! 🎉");
      utils.subscription.myPlan.invalidate();
      setLocation("/profile");
    } catch (err: any) {
      toast.error(err.message || t("error"));
    }
  };

  const freePlanFeatures = language === "pt"
    ? ["Acesso a 50 questões gratuitas", "Banco de questões com filtros", "Perfil gamificado básico", "Ranking geral"]
    : ["Access to 50 free questions", "Question bank with filters", "Basic gamified profile", "General ranking"];

  const premiumFeatures = language === "pt"
    ? ["Questões ilimitadas de todas as disciplinas", "Simulados ilimitados com timer", "Ranking semanal e mensal", "Explicações com IA (Claude)", "10 badges desbloqueáveis", "Histórico completo de simulados", "Suporte prioritário"]
    : ["Unlimited questions from all disciplines", "Unlimited exams with timer", "Weekly and monthly ranking", "AI explanations (Claude)", "10 unlockable badges", "Full exam history", "Priority support"];

  const isPremium = planStatus?.canAccessPremium;
  const isTrial = planStatus?.plan === "trial";

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-16 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/15 text-primary border-primary/30 font-sans">
            {language === "pt" ? "Planos & Preços" : "Plans & Pricing"}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            {language === "pt" ? "Invista no seu futuro" : "Invest in your future"}
          </h1>
          <p className="text-muted-foreground font-sans text-lg max-w-2xl mx-auto">
            {language === "pt"
              ? "Comece gratuitamente e faça upgrade quando estiver pronto. Trial premium de 30 dias sem cartão de crédito."
              : "Start for free and upgrade when you're ready. 30-day premium trial with no credit card required."}
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free plan */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-serif text-xl font-bold">{language === "pt" ? "Gratuito" : "Free"}</h2>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-serif text-4xl font-bold">R$0</span>
                <span className="text-muted-foreground font-sans text-sm">/{language === "pt" ? "sempre" : "forever"}</span>
              </div>
              <p className="text-muted-foreground font-sans text-sm">
                {language === "pt" ? "Para começar sua jornada" : "To start your journey"}
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm font-sans text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full font-sans"
              onClick={() => !isAuthenticated && (window.location.href = getLoginUrl())}
              disabled={isAuthenticated}
            >
              {isAuthenticated ? (language === "pt" ? "Plano Atual" : "Current Plan") : (language === "pt" ? "Começar Grátis" : "Start Free")}
            </Button>
          </div>

          {/* Premium plan */}
          <div className="relative bg-card border-2 border-primary/40 rounded-2xl p-8 flex flex-col shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground font-sans px-4 py-1">
                {language === "pt" ? "Mais Popular" : "Most Popular"}
              </Badge>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-yellow-400" />
                <h2 className="font-serif text-xl font-bold">Premium</h2>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-serif text-4xl font-bold text-primary">R$97</span>
                <span className="text-muted-foreground font-sans text-sm">/{language === "pt" ? "ano" : "year"}</span>
              </div>
              <p className="text-muted-foreground font-sans text-sm">
                {language === "pt" ? "≈ R$8/mês — menos que um café por semana" : "≈ R$8/month — less than a coffee per week"}
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm font-sans">{feature}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Button disabled className="w-full bg-primary text-primary-foreground font-sans gap-2">
                <Crown className="h-4 w-4" />
                {isTrial
                  ? (language === "pt" ? `Trial Ativo — ${planStatus?.trialDaysLeft} dias restantes` : `Trial Active — ${planStatus?.trialDaysLeft} days left`)
                  : (language === "pt" ? "Plano Ativo" : "Active Plan")}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-sans gap-2"
                  onClick={handleStartTrial}
                  disabled={startTrial.isPending}
                >
                  {startTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                  {language === "pt" ? "Iniciar Trial Grátis (30 dias)" : "Start Free Trial (30 days)"}
                </Button>
                <p className="text-center text-xs text-muted-foreground font-sans">
                  {language === "pt" ? "✓ Sem cartão de crédito · ✓ Cancele quando quiser" : "✓ No credit card · ✓ Cancel anytime"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: language === "pt" ? "O trial requer cartão de crédito?" : "Does the trial require a credit card?",
                a: language === "pt" ? "Não! O trial de 30 dias é completamente gratuito e não requer nenhum dado de pagamento." : "No! The 30-day trial is completely free and requires no payment information.",
              },
              {
                q: language === "pt" ? "O que acontece após o trial?" : "What happens after the trial?",
                a: language === "pt" ? "Você volta automaticamente para o plano gratuito. Nenhuma cobrança é feita." : "You automatically return to the free plan. No charges are made.",
              },
              {
                q: language === "pt" ? "Posso cancelar a qualquer momento?" : "Can I cancel at any time?",
                a: language === "pt" ? "Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas." : "Yes! You can cancel your subscription at any time without fees.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-card border border-border/50 rounded-xl p-5">
                <h3 className="font-serif font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground font-sans">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
