import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronLeft, ChevronRight, Crown, Lock, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import QuestionRenderer from "@/components/QuestionRenderer";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const DIFFICULTY_COLORS = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function QuestionBank() {
  const t = useT();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [disciplineId, setDisciplineId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: planData } = trpc.payment.myPlan.useQuery(undefined, { enabled: isAuthenticated });
  const hasAccess = isAuthenticated && (planData?.hasAccess || planData?.plan === "trial" || planData?.plan === "premium");

  const { data: disciplines } = trpc.questions.disciplines.useQuery();
  const { data: subjects } = trpc.questions.subjects.useQuery(
    { disciplineId: parseInt(disciplineId) },
    { enabled: !!disciplineId && disciplineId !== "all" }
  );

  const { data, isLoading } = trpc.questions.list.useQuery({
    disciplineId: disciplineId && disciplineId !== "all" ? parseInt(disciplineId) : undefined,
    subjectId: subjectId && subjectId !== "all" ? parseInt(subjectId) : undefined,
    difficulty: difficulty && difficulty !== "all" ? (difficulty as "easy" | "medium" | "hard") : undefined,
    year: year ? parseInt(year) : undefined,
    search: search || undefined,
    page,
    limit: 15,
  });

  const totalPages = data ? Math.ceil(data.total / 15) : 1;

  const clearFilters = () => {
    setSearch("");
    setDisciplineId("");
    setSubjectId("");
    setDifficulty("");
    setYear("");
    setPage(1);
  };

  const hasFilters = search || disciplineId || subjectId || difficulty || year;

  // Paywall: not logged in or free plan
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
              ? "Faça login para acessar o banco de questões completo com mais de 5.661 questões."
              : "Log in to access the full question bank with over 5,661 questions."}
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
            {language === "pt" ? "Recurso Premium" : "Premium Feature"}
          </h2>
          <p className="text-muted-foreground font-sans mb-2">
            {language === "pt"
              ? "O Banco de Questões completo é exclusivo para assinantes Premium."
              : "The full Question Bank is exclusive to Premium subscribers."}
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-6">
            {language === "pt"
              ? "Ative o trial gratuito de 30 dias ou assine um plano para ter acesso ilimitado."
              : "Activate the free 30-day trial or subscribe to get unlimited access."}
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
      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">{t("bank_title")}</h1>
            <p className="text-muted-foreground font-sans text-sm">
              {data ? `${data.total} ${t("bank_results")}` : t("loading")}
            </p>
          </div>
          {isAuthenticated && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={() => setLocation("/exam")}
            >
              <BookOpen className="h-4 w-4" />
              {t("exam_title")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium font-sans">{t("filter")}</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto gap-1 text-muted-foreground hover:text-foreground h-7 px-2">
                <X className="h-3 w-3" />
                {t("clear")}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("bank_search")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-background border-border/50 font-sans"
              />
            </div>

            <Select value={disciplineId || "all"} onValueChange={(v) => { setDisciplineId(v === "all" ? "" : v); setSubjectId(""); setPage(1); }}>
              <SelectTrigger className="bg-background border-border/50 font-sans">
                <SelectValue placeholder={t("bank_filter_discipline")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bank_all")}</SelectItem>
                {disciplines?.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {language === "pt" ? d.namePt : d.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficulty || "all"} onValueChange={(v) => { setDifficulty(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="bg-background border-border/50 font-sans">
                <SelectValue placeholder={t("bank_filter_difficulty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bank_all")}</SelectItem>
                <SelectItem value="easy">{t("exam_easy")}</SelectItem>
                <SelectItem value="medium">{t("exam_medium")}</SelectItem>
                <SelectItem value="hard">{t("exam_hard")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={subjectId || "all"}
              onValueChange={(v) => { setSubjectId(v === "all" ? "" : v); setPage(1); }}
              disabled={!disciplineId || disciplineId === "all"}
            >
              <SelectTrigger className="bg-background border-border/50 font-sans">
                <SelectValue placeholder={t("bank_filter_subject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bank_all")}</SelectItem>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {language === "pt" ? s.namePt : s.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Questions list */}
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
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="mt-3 font-sans">
                {t("clear")} {t("filter")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {data.questions.map((q, idx) => {
              const options = q.options as Array<{ id: string; textPt: string; textEn?: string }>;
              const isExpanded = expandedId === q.id;
              const isPremiumLocked = q.isPremium && !isAuthenticated;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isExpanded ? "border-primary/40 bg-card" : "border-border/50 bg-card hover:border-primary/20"
                  }`}
                >
                  <button
                    className="w-full text-left p-5 flex items-start gap-4"
                    onClick={() => {
                      if (isPremiumLocked) return;
                      setExpandedId(isExpanded ? null : q.id);
                    }}
                  >
                    <span className="text-xs text-muted-foreground font-sans mt-0.5 w-6 shrink-0">
                      {(page - 1) * 15 + idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`text-xs border font-sans ${DIFFICULTY_COLORS[q.difficulty]}`}>
                          {t(`exam_${q.difficulty}` as any)}
                        </Badge>
                        {q.year && (
                          <Badge variant="outline" className="text-xs font-sans border-border/50">
                            {q.year}
                          </Badge>
                        )}
                        {q.isPremium && (
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-sans gap-1">
                            <Crown className="h-2.5 w-2.5" />
                            {t("bank_premium_badge")}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm font-sans leading-relaxed ${isPremiumLocked ? "blur-sm select-none" : ""}`}>
                        {language === "pt" ? q.textPt : (q.textEn || q.textPt)}
                      </p>
                      {isPremiumLocked && (
                        <div className="flex items-center gap-2 mt-2">
                          <Lock className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="text-xs text-yellow-400 font-sans">
                            {language === "pt" ? "Conteúdo Premium — " : "Premium Content — "}
                            <button
                              onClick={() => (window.location.href = getLoginUrl())}
                              className="underline hover:text-yellow-300"
                            >
                              {t("login_btn")}
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {isExpanded && !isPremiumLocked && (
                    <div className="px-5 pb-5 border-t border-border/30 pt-4">
                      <QuestionRenderer
                        question={{
                          id: q.id,
                          textPt: q.textPt,
                          textEn: q.textEn ?? undefined,
                          questionType: q.questionType ?? undefined,
                          options: options,
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
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1 font-sans"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("prev")}
            </Button>
            <span className="text-sm text-muted-foreground font-sans">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1 font-sans"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
