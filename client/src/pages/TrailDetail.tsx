import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import QuestionRenderer from "@/components/QuestionRenderer";
import { toast } from "sonner";
import {
  BookOpen, CheckCircle2, Lock, PlayCircle, Trophy,
  ArrowLeft, Clock, Star, AlertCircle, RefreshCw, ChevronRight,
  Zap, Shield, TrendingUp, Award, Sparkles, Target,
} from "lucide-react";

// ─── XP / Level helpers ───────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: "Resident",       icon: "🩺", xpRequired: 0,     color: "#6b7280" },
  { level: 2, name: "Estagiário",     icon: "📋", xpRequired: 100,   color: "#10b981" },
  { level: 3, name: "Clínico Geral",  icon: "🏥", xpRequired: 300,   color: "#3b82f6" },
  { level: 4, name: "Especialista",   icon: "🔬", xpRequired: 700,   color: "#8b5cf6" },
  { level: 5, name: "Consultor",      icon: "💡", xpRequired: 1500,  color: "#f59e0b" },
  { level: 6, name: "Pesquisador",    icon: "🧪", xpRequired: 3000,  color: "#ef4444" },
  { level: 7, name: "Professor",      icon: "📚", xpRequired: 5500,  color: "#ec4899" },
  { level: 8, name: "Mestre",         icon: "🎓", xpRequired: 9000,  color: "#f97316" },
  { level: 9, name: "Lenda",          icon: "👑", xpRequired: 15000, color: "#eab308" },
];

function getLevelInfo(xp: number) {
  let current = LEVELS[0]!;
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level + 1);
  const next = nextIdx >= 0 ? LEVELS[nextIdx] : null;
  const progressToNext = next
    ? Math.round(((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100)
    : 100;
  return { current, next, progressToNext };
}

function ProgressRing({ percent, size = 48, stroke = 4, color = "#10b981" }: {
  percent: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={stroke} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ─── XP Gain Popup ────────────────────────────────────────────────────────────
function XpGainPopup({ xp, show }: { xp: number; show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed top-20 right-6 z-50 animate-bounce">
      <div className="bg-amber-500 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <Zap className="h-4 w-4" />
        +{xp} XP
      </div>
    </div>
  );
}

// ─── Level Up Celebration ─────────────────────────────────────────────────────
function LevelUpBanner({ level, name, icon, onClose }: {
  level: number; name: string; icon: string; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-6xl mb-4">{icon}</div>
        <div className="text-amber-400 font-bold text-sm mb-1 tracking-widest uppercase">Nível Alcançado!</div>
        <h2 className="text-3xl font-extrabold mb-2">Nível {level}</h2>
        <p className="text-xl text-muted-foreground mb-6">{name}</p>
        <div className="flex gap-1 justify-center mb-6">
          {[...Array(5)].map((_, i) => <Sparkles key={i} className="h-5 w-5 text-amber-400" />)}
        </div>
        <Button onClick={onClose} className="w-full">Continuar</Button>
      </div>
    </div>
  );
}

type ModuleQuestion = {
  id: number; textPt: string; textEn?: string | null;
  options: unknown; correctOption: string; explanationPt?: string | null;
  questionType?: string | null; formatData?: unknown;
  assertion1?: string | null; assertion2?: string | null;
  imageUrl?: string | null; difficulty?: string | null;
};

type ModuleStatus = "locked" | "available" | "passed" | "failed" | "in_progress";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil", medium: "Médio", hard: "Difícil", mixed: "Misto",
};

export default function TrailDetail() {
  const [, params] = useRoute("/trails/:id");
  const trailId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();

  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number; correct: number; total: number; passed: boolean;
    minPassRate: number; attemptNumber: number; xpEarned?: number;
  } | null>(null);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; name: string; icon: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: trail, isLoading } = trpc.trails.getById.useQuery({ id: trailId }, { enabled: trailId > 0 });
  const { data: enrollment, refetch: refetchEnrollment } = trpc.trails.getEnrollment.useQuery(
    { trailId }, { enabled: trailId > 0 && !!user }
  );
  const { data: moduleQuestions, isLoading: loadingQuestions } = trpc.trails.getModuleQuestions.useQuery(
    { moduleId: activeModuleId!, trailId },
    { enabled: activeModuleId !== null && !!enrollment }
  );
  const { data: profile, refetch: refetchProfile } = trpc.gamification.myProfile.useQuery(
    undefined, { enabled: !!user }
  );

  const xp = (profile as { xp?: number } | undefined)?.xp ?? 0;
  const level = (profile as { level?: number } | undefined)?.level ?? 1;
  const { current: lvlInfo, next: nextLvl, progressToNext } = getLevelInfo(xp);

  const enrollMutation = trpc.trails.enroll.useMutation({
    onSuccess: () => { refetchEnrollment(); toast.success("Matriculado com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.trails.submitModuleAnswers.useMutation({
    onSuccess: (result) => {
      const r = result as typeof result & { xpEarned?: number; newLevel?: number; leveledUp?: boolean };
      setQuizResult({ ...r, xpEarned: r.xpEarned });
      setQuizSubmitted(true);
      refetchEnrollment();
      refetchProfile();
      utils.trails.getEnrollment.invalidate({ trailId });

      if (r.passed) {
        toast.success(`Módulo concluído! ${r.score}% de acerto`);
        if (r.xpEarned && r.xpEarned > 0) {
          setShowXpPopup(true);
          setTimeout(() => setShowXpPopup(false), 2500);
        }
        if (r.leveledUp && r.newLevel) {
          const lvl = LEVELS.find(l => l.level === r.newLevel);
          if (lvl) setTimeout(() => setLevelUpInfo({ level: lvl.level, name: lvl.name, icon: lvl.icon }), 800);
        }
      } else {
        toast.error(`Não passou. ${r.score}% de acerto (mínimo: ${r.minPassRate}%)`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const getModuleProgress = (moduleId: number) => {
    return enrollment?.moduleProgress?.find((p: { moduleId: number }) => p.moduleId === moduleId);
  };

  const handleStartModule = (moduleId: number) => {
    setActiveModuleId(moduleId);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  };

  const handleRetryModule = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
    utils.trails.getModuleQuestions.invalidate({ moduleId: activeModuleId!, trailId });
  };

  const handleSubmitQuiz = () => {
    if (!activeModuleId || !moduleQuestions) return;
    const answers = Object.entries(quizAnswers).map(([qId, opt]) => ({
      questionId: parseInt(qId), selectedOption: opt,
    }));
    if (answers.length < moduleQuestions.length) {
      toast.error(`Responda todas as ${moduleQuestions.length} questões antes de enviar`);
      return;
    }
    submitMutation.mutate({ trailId, moduleId: activeModuleId, answers });
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 mb-6 rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!trail) return (
    <div className="container py-8 max-w-4xl text-center">
      <p className="text-muted-foreground">Trilha não encontrada.</p>
      <Link href="/trails"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" />Voltar</Button></Link>
    </div>
  );

  // ─── Active Quiz View ─────────────────────────────────────────────────────
  if (activeModuleId !== null) {
    const mod = (trail.modules as Array<{ id: number; title: string; questionCount: number; minPassRate: number }>)
      .find(m => m.id === activeModuleId);
    const answered = Object.keys(quizAnswers).length;
    const total = moduleQuestions?.length ?? 0;
    const answerPct = total > 0 ? Math.round((answered / total) * 100) : 0;

    return (
      <div className="min-h-screen bg-background">
        <XpGainPopup xp={quizResult?.xpEarned ?? 0} show={showXpPopup} />
        {levelUpInfo && (
          <LevelUpBanner {...levelUpInfo} onClose={() => setLevelUpInfo(null)} />
        )}

        <div className="container py-6 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveModuleId(null)} className="gap-1">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{trail.title}</p>
              <h2 className="font-semibold text-sm">{mod?.title}</h2>
            </div>
            {/* XP indicator */}
            <div className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
              <Zap className="h-3 w-3" />
              <span>{xp.toLocaleString("pt-BR")} XP</span>
            </div>
          </div>

          {/* Progress bar */}
          {!quizSubmitted && total > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-muted/20 border">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{answered}</span> / {total} respondidas
                </span>
                <span className="text-muted-foreground">
                  Mínimo: <span className="font-semibold text-foreground">{mod?.minPassRate}%</span>
                </span>
              </div>
              <Progress value={answerPct} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>+{answered * 3} XP acumulado</span>
                <span>{total - answered} restantes</span>
              </div>
            </div>
          )}

          {/* Result Screen */}
          {quizSubmitted && quizResult && (
            <Card className={`mb-6 border-2 ${quizResult.passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
              <CardContent className="p-6 text-center">
                {quizResult.passed ? (
                  <div className="relative inline-block mb-3">
                    <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>
                ) : (
                  <AlertCircle className="h-14 w-14 text-red-400 mx-auto mb-3" />
                )}
                <h3 className="text-xl font-bold mb-1">
                  {quizResult.passed ? "Módulo Concluído!" : "Não passou desta vez"}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {quizResult.correct} de {quizResult.total} corretas — {quizResult.score}%
                  {!quizResult.passed && ` (mínimo: ${quizResult.minPassRate}%)`}
                </p>
                {quizResult.passed && quizResult.xpEarned && quizResult.xpEarned > 0 && (
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                    <Zap className="h-4 w-4" />
                    +{quizResult.xpEarned} XP ganhos
                  </div>
                )}
                <div className="flex gap-3 justify-center mt-2">
                  {!quizResult.passed && (
                    <Button onClick={handleRetryModule} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" />Tentar novamente
                    </Button>
                  )}
                  <Button onClick={() => setActiveModuleId(null)} className="gap-2">
                    {quizResult.passed ? <ChevronRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    {quizResult.passed ? "Próximo módulo" : "Voltar à trilha"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions */}
          {loadingQuestions ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : moduleQuestions && moduleQuestions.length > 0 ? (
            <div className="space-y-6">
              {(moduleQuestions as ModuleQuestion[]).map((q, idx) => (
                <Card key={q.id} className={`${quizSubmitted ? "opacity-80" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Questão {idx + 1} de {total}</span>
                      {quizAnswers[q.id] && !quizSubmitted && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />Respondida
                        </span>
                      )}
                    </div>
                    <QuestionRenderer
                      question={q as Parameters<typeof QuestionRenderer>[0]["question"]}
                      selectedOption={quizAnswers[q.id] ?? null}
                      answered={quizSubmitted}
                      showExplanation={quizSubmitted}
                      revealAnswer={quizSubmitted}
                      onAnswer={quizSubmitted ? undefined : (opt: string) =>
                        setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))
                      }
                    />
                  </CardContent>
                </Card>
              ))}
              {!quizSubmitted && (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizAnswers).length < moduleQuestions.length || submitMutation.isPending}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Target className="h-4 w-4" />
                  {submitMutation.isPending ? "Enviando..." : `Enviar ${total} Respostas`}
                </Button>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma questão disponível para este módulo.</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ─── Trail Overview ───────────────────────────────────────────────────────
  const modules = trail.modules as Array<{
    id: number; title: string; summary?: string | null;
    questionCount: number; minPassRate: number; difficulty: string; order: number;
  }>;
  const totalModules = modules.length;
  const passedModules = enrollment?.moduleProgress?.filter((p: { status: string }) => p.status === "passed").length ?? 0;
  const progressPercent = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;
  const estimatedXp = totalModules * 30 * 3;

  return (
    <div className="min-h-screen bg-background">
      <XpGainPopup xp={0} show={false} />
      {levelUpInfo && <LevelUpBanner {...levelUpInfo} onClose={() => setLevelUpInfo(null)} />}

      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <Link href="/trails">
          <Button variant="ghost" size="sm" className="gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />Trilhas
          </Button>
        </Link>

        {/* ── Trail Hero ─────────────────────────────────────────────────── */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/70 to-primary/30" style={{ width: `${progressPercent}%`, minWidth: progressPercent > 0 ? "8px" : "0" }} />
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-1">{trail.title}</h1>
                {trail.description && <p className="text-muted-foreground text-sm">{trail.description}</p>}
              </div>
              {enrollment?.status === "completed" && (
                <div className="shrink-0 text-center">
                  <Trophy className="h-10 w-10 text-amber-400 mx-auto" />
                  <p className="text-xs text-amber-400 font-semibold mt-1">Concluída!</p>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" />{totalModules} módulos
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />{trail.totalHours}h estimadas
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />{trail.passingScore}% para passar
              </Badge>
              <Badge className="gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20 border">
                <Zap className="h-3 w-3" />~{estimatedXp.toLocaleString("pt-BR")} XP
              </Badge>
            </div>

            {/* Progress section */}
            {enrollment ? (
              <div className="space-y-3">
                {/* Segmented module bar */}
                <div className="flex gap-1 h-3">
                  {modules.map((_, i) => {
                    const prog = getModuleProgress(modules[i]!.id);
                    const st = prog?.status ?? "locked";
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-500 ${
                          st === "passed" ? "bg-emerald-500" :
                          st === "available" ? "bg-primary/60" :
                          st === "failed" ? "bg-red-500/60" :
                          "bg-muted/30"
                        }`}
                        title={modules[i]?.title}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{passedModules}</span> / {totalModules} módulos concluídos
                  </span>
                  <span className={`font-bold text-lg ${progressPercent === 100 ? "text-emerald-400" : "text-primary"}`}>
                    {progressPercent}%
                  </span>
                </div>

                {/* XP bar for this trail */}
                {user && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3 w-3 text-amber-400" />
                        Seu XP total
                      </span>
                      <span className="font-semibold" style={{ color: lvlInfo.color }}>
                        {lvlInfo.icon} {lvlInfo.name} — Nv.{level}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{ width: `${progressToNext}%`, background: lvlInfo.color }}
                      />
                    </div>
                    {nextLvl && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(nextLvl.xpRequired - xp).toLocaleString("pt-BR")} XP para {nextLvl.icon} {nextLvl.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => enrollMutation.mutate({ trailId })}
                disabled={enrollMutation.isPending || !user}
                className="gap-2 w-full sm:w-auto"
                size="lg"
              >
                <PlayCircle className="h-5 w-5" />
                {!user ? "Faça login para se matricular" : enrollMutation.isPending ? "Matriculando..." : "Iniciar Trilha"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Module Timeline ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Módulos da Trilha
        </h2>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border" />

          <div className="space-y-3">
            {modules.map((mod, idx) => {
              const progress = getModuleProgress(mod.id);
              const status: ModuleStatus = progress?.status ?? "locked";
              const isAvailable = status === "available" || status === "failed";
              const isPassed = status === "passed";
              const isLocked = status === "locked" || !enrollment;
              const moduleXp = mod.questionCount * 3;

              return (
                <div key={mod.id} className="relative flex gap-4">
                  {/* Node */}
                  <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isPassed
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                      : isAvailable
                      ? "bg-primary/20 border-primary/60 text-primary animate-pulse"
                      : isLocked
                      ? "bg-muted/20 border-border text-muted-foreground"
                      : "bg-red-500/10 border-red-500/40 text-red-400"
                  }`}>
                    {isPassed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : status === "failed" ? (
                      <RefreshCw className="h-5 w-5" />
                    ) : (
                      <span className="font-bold text-lg">{idx + 1}</span>
                    )}
                  </div>

                  {/* Card */}
                  <Card className={`flex-1 transition-all ${
                    isLocked
                      ? "opacity-50"
                      : isPassed
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : isAvailable
                      ? "border-primary/30 hover:border-primary/60 hover:shadow-md"
                      : "border-red-500/20"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm">{mod.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {DIFFICULTY_LABELS[mod.difficulty] ?? mod.difficulty}
                            </Badge>
                            {isPassed && (
                              <Badge className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                                ✓ Aprovado
                              </Badge>
                            )}
                            {status === "failed" && (
                              <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20 border">
                                Repetir
                              </Badge>
                            )}
                          </div>
                          {mod.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{mod.summary}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />{mod.questionCount} questões
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />Mín. {mod.minPassRate}%
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                              <Zap className="h-3 w-3" />+{moduleXp} XP
                            </span>
                            {progress && progress.attempts > 0 && (
                              <span>Tentativas: {progress.attempts}</span>
                            )}
                            {(progress?.bestScore ?? 0) > 0 && (
                              <span className={isPassed ? "text-emerald-400 font-semibold" : "text-red-400"}>
                                Melhor: {progress?.bestScore}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          {isPassed ? (
                            <div className="flex flex-col items-center gap-1">
                              <ProgressRing percent={progress?.bestScore ?? 0} size={40} stroke={3} color="#10b981" />
                              <span className="text-[10px] text-emerald-400 font-bold">{progress?.bestScore}%</span>
                            </div>
                          ) : isAvailable ? (
                            <Button size="sm" onClick={() => handleStartModule(mod.id)} className="gap-1">
                              {status === "failed"
                                ? <><RefreshCw className="h-3 w-3" />Repetir</>
                                : <><PlayCircle className="h-3 w-3" />Iniciar</>}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Final Exam CTA ─────────────────────────────────────────────── */}
        {enrollment && passedModules === totalModules && totalModules > 0 && enrollment.status !== "completed" && (
          <Card className="mt-6 border-amber-500/40 bg-amber-500/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-1">Todos os módulos concluídos!</h3>
              <p className="text-muted-foreground mb-2">
                Você está pronto para o exame final. Precisa de {trail.passingScore}% para obter o certificado.
              </p>
              <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 border gap-1">
                <Zap className="h-3 w-3" />Bônus: +{(totalModules * 30 * 3 * 2).toLocaleString("pt-BR")} XP no exame final
              </Badge>
              <br />
              <Link href={`/trails/${trailId}/exam`}>
                <Button className="gap-2 mt-2" size="lg">
                  <Award className="h-5 w-5" />Fazer Exame Final
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {enrollment?.status === "completed" && (
          <Card className="mt-6 border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-1">Trilha Concluída!</h3>
              <p className="text-muted-foreground">
                Parabéns! Você concluiu esta trilha com {enrollment.finalExamScore}% no exame final.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
