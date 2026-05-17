import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { QuestionFilters, type QuestionFilterState, EMPTY_FILTERS } from "@/components/QuestionFilters";
import QuestionRenderer from "@/components/QuestionRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, ChevronLeft, ChevronRight, Crown, Lock,
  SlidersHorizontal, Sparkles,
} from "lucide-react";

const DIFFICULTY_COLORS: Record<string, string> = {
  very_easy: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  very_hard: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const DIFFICULTY_PT: Record<string, string> = {
  very_easy: "Muito Fácil",
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  very_hard: "Muito Difícil",
};

const PAGE_SIZE = 15;

export default function QuestionBank() {
  const t = useT();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: planData } = trpc.payment.myPlan.useQuery(undefined, { enabled: isAuthenticated });
  const hasAccess = isAuthenticated && (planData?.hasAccess || planData?.plan === "trial" || planData?.plan === "premium");

  // Build query params from appliedFilters
  const queryParams = {
    disciplineId: appliedFilters.disciplineId,
    subjectId: appliedFilters.subjectId,
    search: appliedFilters.search || undefined,
    questionType: (appliedFilters.questionMode === "multiple_choice" || appliedFilters.questionMode === "discursive")
      ? (appliedFilters.questionMode === "discursive" ? "discursive" as any : undefined)
      : (appliedFilters.questionType as any),
    difficulty: appliedFilters.difficulty as any,
    year: appliedFilters.year,
    yearFrom: appliedFilters.yearFrom,
    yearTo: appliedFilters.yearTo,
    author: appliedFilters.author,
    banca: appliedFilters.banca,
    instituicao: appliedFilters.instituicao,
    cargo: appliedFilters.cargo,
    carreira: appliedFilters.carreira,
    areaFormacao: appliedFilters.areaFormacao,
    escolaridade: appliedFilters.escolaridade as any,
    hasExplanation: appliedFilters.hasExplanation,
    myAnswers: appliedFilters.myAnswers,
    includeAnuladas: appliedFilters.includeAnuladas,
    includeDesatualizadas: appliedFilters.includeDesatualizadas,
    orderBy: appliedFilters.orderBy,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading } = trpc.questions.list.useQuery(queryParams);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleApply = () => {
    setAppliedFilters(filters);
    setPage(1);
    setExpandedId(null);
  };

  // ─── Paywall gates ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-3">
            {language === "pt" ? "Acesso Exclusivo" : "Exclusive Access"}
          </h2>
          <p className="text-muted-foreground font-sans mb-6">
            {language === "pt"
              ? "Faça login para acessar o banco de questões completo com mais de 5.661 questões."
              : "Log in to access the full question bank with over 5,661 questions."}
          </p>
          <Button className="bg-primary text-primary-foreground w-full mb-3" onClick={() => window.location.href = getLoginUrl()}>
            {t("nav_login")}
          </Button>
          <Link href="/pricing">
            <Button variant="outline" className="w-full font-sans">{t("nav_pricing")}</Button>
          </Link>
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
            {language === "pt" ? "Recurso Premium" : "Premium Feature"}
          </h2>
          <p className="text-muted-foreground font-sans mb-6">
            {language === "pt"
              ? "Ative o trial gratuito de 7 dias ou assine um plano para ter acesso ilimitado."
              : "Activate the free 7-day trial or subscribe to get unlimited access."}
          </p>
          <Link href="/pricing">
            <Button className="bg-primary text-primary-foreground w-full gap-2">
              <Sparkles className="h-4 w-4" />
              {language === "pt" ? "Ver Planos — Trial Grátis 7 dias" : "View Plans — Free 7-day Trial"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">{t("bank_title")}</h1>
            <p className="text-muted-foreground font-sans text-sm">
              {data ? `${data.total} ${t("bank_results")}` : t("loading")}
            </p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            onClick={() => setLocation("/exam")}
          >
            <BookOpen className="h-4 w-4" />
            {t("exam_title")}
          </Button>
        </div>

        {/* Filter panel */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium font-sans">{t("filter")}</span>
          </div>
          <QuestionFilters
            filters={filters}
            onChange={setFilters}
            onApply={handleApply}
          />
        </div>

        {/* Question list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : !data?.questions.length ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-sans">{t("bank_no_results")}</p>
            <Button variant="ghost" onClick={() => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }} className="mt-3 font-sans">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.questions.map((q, idx) => {
              const options = q.options as Array<{ id: string; textPt: string; textEn?: string }>;
              const isExpanded = expandedId === q.id;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded ? "border-primary/40 bg-card" : "border-border/50 bg-card hover:border-primary/20"
                  }`}
                >
                  <button
                    className="w-full text-left p-5 flex items-start gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  >
                    <span className="text-xs text-muted-foreground font-sans mt-0.5 w-6 shrink-0">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`text-xs border font-sans ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                          {DIFFICULTY_PT[q.difficulty] ?? q.difficulty}
                        </Badge>
                        {q.banca && (
                          <Badge variant="outline" className="text-xs font-sans border-border/50">{q.banca}</Badge>
                        )}
                        {q.year && (
                          <Badge variant="outline" className="text-xs font-sans border-border/50">{q.year}</Badge>
                        )}
                        {q.isAnulada && (
                          <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">Anulada</Badge>
                        )}
                        {q.isDesatualizada && (
                          <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">Desatualizada</Badge>
                        )}
                        {q.isPremium && (
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
                            <Crown className="h-2.5 w-2.5" /> Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-sans leading-relaxed line-clamp-3">
                        {language === "pt" ? q.textPt : (q.textEn || q.textPt)}
                      </p>
                      {(q.instituicao || q.cargo) && (
                        <p className="text-xs text-muted-foreground mt-1 font-sans">
                          {[q.instituicao, q.cargo].filter(Boolean).join(" — ")}
                        </p>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border/30 pt-4">
                      <QuestionRenderer
                        question={{
                          id: q.id,
                          textPt: q.textPt,
                          textEn: q.textEn ?? undefined,
                          questionType: q.questionType ?? undefined,
                          options,
                          correctOption: q.correctOption,
                          explanationPt: q.explanationPt ?? undefined,
                          explanationEn: (q as any).explanationEn ?? undefined,
                          assertion1: q.assertion1 ?? undefined,
                          assertion2: q.assertion2 ?? undefined,
                          formatData: (q as any).formatData,
                          difficulty: q.difficulty,
                          disciplineName: (q as any).disciplineName,
                          subjectTag: q.subjectTag ?? undefined,
                          author: q.author ?? undefined,
                          year: q.year ?? undefined,
                        }}
                        answered={true}
                        revealAnswer={true}
                        language={language as "pt" | "en"}
                        showExplanation={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1 font-sans"
            >
              <ChevronLeft className="h-4 w-4" /> {t("prev")}
            </Button>
            <span className="text-sm text-muted-foreground font-sans">{page} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1 font-sans"
            >
              {t("next")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
