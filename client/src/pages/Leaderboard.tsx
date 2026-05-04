import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { LEVELS } from "@/lib/levels";
import { Crown, Lock, Medal, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

type TabType = "weekly" | "monthly" | "alltime";

const PODIUM_COLORS = [
  { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-400", icon: Crown },
  { bg: "bg-gray-400/20", border: "border-gray-400/40", text: "text-gray-300", icon: Medal },
  { bg: "bg-orange-600/20", border: "border-orange-600/40", text: "text-orange-400", icon: Medal },
];

export default function Leaderboard() {
  const t = useT();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("weekly");

  const { isAuthenticated } = useAuth();
  const { data: planData } = trpc.payment.myPlan.useQuery(undefined, { enabled: !!user });
  const hasAccess = !!user && (planData?.hasAccess || planData?.plan === "trial" || planData?.plan === "premium");

  const { data: leaderboard, isLoading } = trpc.leaderboard.get.useQuery(
    { type: tab, limit: 50 },
    { enabled: hasAccess }
  );
  const { data: profile } = trpc.gamification.myProfile.useQuery(undefined, { enabled: !!user });

  const top3 = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  const getLevelName = (level: number) => {
    const lvl = LEVELS.find((l) => l.level === level);
    if (!lvl) return "";
    return language === "pt" ? lvl.name : lvl.nameEn;
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "weekly", label: t("lb_weekly") },
    { key: "monthly", label: t("lb_monthly") },
    { key: "alltime", label: t("lb_alltime") },
  ];

  // Paywall gates
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-3">{language === "pt" ? "Acesso Exclusivo" : "Exclusive Access"}</h2>
          <p className="text-muted-foreground font-sans mb-6">
            {language === "pt"
              ? "Faça login para ver o ranking e competir com outros estudantes."
              : "Log in to view the leaderboard and compete with other students."}
          </p>
          <Button className="bg-primary text-primary-foreground w-full mb-3" onClick={() => window.location.href = getLoginUrl()}>
            {t("nav_login")}
          </Button>
          <Link href="/pricing"><Button variant="outline" className="w-full font-sans">{t("nav_pricing")}</Button></Link>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasAccess && planData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <Crown className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-3">
            {language === "pt" ? "Ranking Premium" : "Premium Leaderboard"}
          </h2>
          <p className="text-muted-foreground font-sans mb-2">
            {language === "pt"
              ? "O ranking é exclusivo para assinantes Premium."
              : "The leaderboard is exclusive to Premium subscribers."}
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-6">
            {language === "pt"
              ? "Ative o trial gratuito de 30 dias e comece a competir agora."
              : "Activate the free 30-day trial and start competing now."}
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/pricing">
              <Button className="bg-primary text-primary-foreground w-full gap-2">
                <Sparkles className="h-4 w-4" />
                {language === "pt" ? "Ver Planos — Trial Grátis 30 dias" : "View Plans — Free 30-day Trial"}
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground font-sans">
              {language === "pt" ? "Sem cartão de crédito necessário" : "No credit card required"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/15 border border-yellow-500/30 mx-auto mb-4">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="font-serif text-3xl font-bold mb-2">{t("lb_title")}</h1>
          <p className="text-muted-foreground font-sans text-sm">
            {language === "pt" ? "Veja quem está no topo do ranking" : "See who's at the top of the ranking"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-card border border-border/50 rounded-xl p-1 mb-8">
          {tabs.map((t_) => (
            <button
              key={t_.key}
              onClick={() => setTab(t_.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium font-sans transition-colors ${
                tab === t_.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t_.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : !leaderboard?.length ? (
          <div className="text-center py-20">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-sans">{t("lb_empty")}</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-10">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${PODIUM_COLORS[1].bg} ${PODIUM_COLORS[1].border}`}>
                    <span className="font-serif text-lg font-bold text-gray-300">
                      {top3[1]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium font-sans truncate max-w-20">{top3[1]?.name?.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground font-sans">{top3[1]?.xp} XP</div>
                  </div>
                  <div className={`h-16 w-20 rounded-t-xl flex items-center justify-center ${PODIUM_COLORS[1].bg} border ${PODIUM_COLORS[1].border}`}>
                    <span className={`font-serif text-2xl font-bold ${PODIUM_COLORS[1].text}`}>2</span>
                  </div>
                </div>

                {/* 1st */}
                <div className="flex flex-col items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${PODIUM_COLORS[0].bg} ${PODIUM_COLORS[0].border}`}>
                    <span className="font-serif text-xl font-bold text-yellow-400">
                      {top3[0]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium font-sans truncate max-w-24">{top3[0]?.name?.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground font-sans">{top3[0]?.xp} XP</div>
                  </div>
                  <div className={`h-24 w-24 rounded-t-xl flex items-center justify-center ${PODIUM_COLORS[0].bg} border ${PODIUM_COLORS[0].border}`}>
                    <span className={`font-serif text-3xl font-bold ${PODIUM_COLORS[0].text}`}>1</span>
                  </div>
                </div>

                {/* 3rd */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${PODIUM_COLORS[2].bg} ${PODIUM_COLORS[2].border}`}>
                    <span className="font-serif text-lg font-bold text-orange-400">
                      {top3[2]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium font-sans truncate max-w-20">{top3[2]?.name?.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground font-sans">{top3[2]?.xp} XP</div>
                  </div>
                  <div className={`h-10 w-20 rounded-t-xl flex items-center justify-center ${PODIUM_COLORS[2].bg} border ${PODIUM_COLORS[2].border}`}>
                    <span className={`font-serif text-2xl font-bold ${PODIUM_COLORS[2].text}`}>3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {leaderboard.map((entry) => {
                const isMe = profile?.user?.id === entry.userId;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isMe
                        ? "bg-primary/10 border-primary/40"
                        : "bg-card border-border/50 hover:border-primary/20"
                    }`}
                  >
                    <div className={`w-8 text-center font-serif font-bold text-lg ${
                      entry.rank === 1 ? "text-yellow-400" :
                      entry.rank === 2 ? "text-gray-300" :
                      entry.rank === 3 ? "text-orange-400" :
                      "text-muted-foreground"
                    }`}>
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent border border-border/50 shrink-0">
                      <span className="font-serif font-bold text-sm">
                        {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-sans text-sm truncate">{entry.name}</span>
                        {isMe && (
                          <Badge className="text-xs bg-primary/20 text-primary border-primary/30 font-sans">{t("lb_you")}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-sans">
                        Lv.{entry.level} · {getLevelName(entry.level)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-serif font-bold text-primary">{entry.xp.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground font-sans">XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
