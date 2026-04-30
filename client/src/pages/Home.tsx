import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Crown,
  FlaskConical,
  Globe,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const DISCIPLINE_ICONS: Record<string, string> = {
  pharmacology: "💊",
  clinics: "🩺",
  herpetology: "🦎",
  ornithology: "🦜",
  anesthesiology: "💉",
  "small-mammals": "🐹",
};

const LEVEL_ICONS = ["🎓", "🔬", "🩺", "⭐", "💡", "🔭", "📚", "🏆", "👑"];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const t = useT();
  const { language } = useLanguage();
  const { data: disciplines } = trpc.questions.disciplines.useQuery();

  const stats = [
    { label: t("stats_questions"), value: "500+", icon: BookOpen },
    { label: t("stats_students"), value: "2K+", icon: Users },
    { label: t("stats_exams"), value: "10K+", icon: FlaskConical },
    { label: t("stats_accuracy"), value: "78%", icon: Star },
  ];

  const features = [
    { icon: BookOpen, title: t("feat_bank_title"), desc: t("feat_bank_desc"), color: "text-primary" },
    { icon: FlaskConical, title: t("feat_exam_title"), desc: t("feat_exam_desc"), color: "text-cyan-400" },
    { icon: Zap, title: t("feat_gamification_title"), desc: t("feat_gamification_desc"), color: "text-yellow-400" },
    { icon: Trophy, title: t("feat_ranking_title"), desc: t("feat_ranking_desc"), color: "text-orange-400" },
    { icon: Brain, title: t("feat_ai_title"), desc: t("feat_ai_desc"), color: "text-purple-400" },
    { icon: Globe, title: t("feat_bilingual_title"), desc: t("feat_bilingual_desc"), color: "text-blue-400" },
  ];

  const levels = [
    t("level_1"), t("level_2"), t("level_3"), t("level_4"), t("level_5"),
    t("level_6"), t("level_7"), t("level_8"), t("level_9"),
  ];

  const plans = [
    {
      name: t("plan_free"),
      price: t("plan_free_price"),
      period: "",
      desc: t("plan_free_desc"),
      features: t("plan_free_features") as unknown as string[],
      cta: t("plan_cta_free"),
      highlight: false,
      badge: null,
      noCard: false,
    },
    {
      name: t("plan_trial"),
      price: t("plan_trial_price"),
      period: "",
      desc: t("plan_trial_desc"),
      features: t("plan_trial_features") as unknown as string[],
      cta: t("plan_cta_trial"),
      highlight: true,
      badge: t("plan_popular"),
      noCard: true,
    },
    {
      name: t("plan_premium"),
      price: t("plan_premium_price"),
      period: t("plan_per_year"),
      desc: t("plan_premium_desc"),
      features: t("plan_premium_features") as unknown as string[],
      cta: t("plan_cta_premium"),
      highlight: false,
      badge: null,
      noCard: false,
    },
  ];

  const fallbackDisciplines = [
    { slug: "pharmacology", namePt: "Farmacologia", nameEn: "Pharmacology" },
    { slug: "clinics", namePt: "Clínica", nameEn: "Clinics" },
    { slug: "herpetology", namePt: "Herpetologia", nameEn: "Herpetology" },
    { slug: "ornithology", namePt: "Ornitologia", nameEn: "Ornithology" },
    { slug: "anesthesiology", namePt: "Anestesiologia", nameEn: "Anesthesiology" },
    { slug: "small-mammals", namePt: "Pequenos Mamíferos", nameEn: "Small Mammals" },
  ];

  const displayDisciplines = (disciplines && disciplines.length > 0) ? disciplines : fallbackDisciplines;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-24 md:py-36">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />
        </div>
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 px-4 py-1.5 text-sm font-sans">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {t("hero_badge")}
            </Badge>
            <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gradient">{t("hero_title")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-sans">
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/exam">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-8 gap-2 text-base">
                    {t("hero_cta_primary")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-8 gap-2 text-base"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  {t("hero_cta_primary")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-border/60 hover:border-primary/50 px-8 text-base">
                  {t("hero_cta_secondary")}
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground flex items-center justify-center gap-2 font-sans">
              <Check className="h-4 w-4 text-primary" />
              {t("hero_trial")}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="font-serif text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-sans">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4">{t("features_title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-sans">{t("features_subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <feat.icon className={`h-5 w-5 ${feat.color}`} />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">{feat.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed font-sans">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disciplines */}
      <section className="py-24 bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4">{t("disciplines_title")}</h2>
            <p className="text-muted-foreground text-lg font-sans">{t("disciplines_subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayDisciplines.map((d: any) => (
              <Link key={d.slug} href={`/bank?discipline=${d.id || d.slug}`}>
                <div className="group p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 text-center cursor-pointer hover:shadow-md hover:shadow-primary/5">
                  <div className="text-3xl mb-3">{DISCIPLINE_ICONS[d.slug] || "📚"}</div>
                  <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors font-sans">
                    {language === "pt" ? d.namePt : d.nameEn}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4">{t("levels_title")}</h2>
            <p className="text-muted-foreground text-lg font-sans">{t("levels_subtitle")}</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3 max-w-4xl mx-auto">
            {levels.map((level, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  i === 8
                    ? "bg-yellow-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10"
                    : "bg-card border-border/50"
                }`}
              >
                <span className="text-2xl">{LEVEL_ICONS[i]}</span>
                <span className={`text-xs font-medium text-center leading-tight font-sans ${i === 8 ? "text-yellow-400" : "text-muted-foreground"}`}>
                  {level}
                </span>
                <span className="text-xs text-muted-foreground/60 font-sans">Lv.{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4">{t("pricing_title")}</h2>
            <p className="text-muted-foreground text-lg font-sans">{t("pricing_subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.highlight
                    ? "bg-primary/10 border-primary/40 shadow-xl shadow-primary/10 scale-105"
                    : "bg-card border-border/50"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 font-sans">{plan.badge}</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-serif text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="font-serif text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1 font-sans">{plan.period}</span>}
                  {plan.noCard && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1 font-sans">
                      <Check className="h-3 w-3" />
                      {t("plan_no_card")}
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat: string) => (
                    <li key={feat} className="flex items-center gap-2 text-sm font-sans">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>
                {isAuthenticated ? (
                  <Link href="/profile">
                    <Button
                      className={`w-full font-sans ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className={`w-full font-sans ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-primary" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    {plan.cta}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center p-12 rounded-3xl bg-primary/10 border border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <Crown className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="font-serif text-3xl font-bold mb-4">
              {language === "pt" ? "Pronto para começar sua jornada?" : "Ready to start your journey?"}
            </h2>
            <p className="text-muted-foreground mb-8 font-sans">
              {language === "pt"
                ? "Junte-se a milhares de estudantes que já estão se preparando com o VetRank."
                : "Join thousands of students already preparing with VetRank."}
            </p>
            {isAuthenticated ? (
              <Link href="/exam">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-10 gap-2">
                  {t("hero_cta_primary")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary px-10 gap-2"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                {t("hero_cta_primary")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-serif text-lg font-bold text-gradient">VetRank</span>
            </div>
            <p className="text-sm text-muted-foreground font-sans">
              © 2025 VetRank. {language === "pt" ? "Todos os direitos reservados." : "All rights reserved."}
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground font-sans">
              <Link href="/bank" className="hover:text-primary transition-colors">{t("nav_bank")}</Link>
              <Link href="/leaderboard" className="hover:text-primary transition-colors">{t("nav_leaderboard")}</Link>
              <Link href="/pricing" className="hover:text-primary transition-colors">{t("nav_pricing")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
