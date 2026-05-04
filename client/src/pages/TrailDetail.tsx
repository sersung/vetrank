import { useState } from "react";
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
  Zap,
} from "lucide-react";

type ModuleQuestion = {
  id: number; textPt: string; textEn?: string | null;
  options: unknown; correctOption: string; explanationPt?: string | null;
  questionType?: string | null; formatData?: unknown;
  assertion1?: string | null; assertion2?: string | null;
  imageUrl?: string | null; difficulty?: string | null;
};

type ModuleStatus = "locked" | "available" | "passed" | "failed" | "in_progress";

export default function TrailDetail() {
  const [, params] = useRoute("/trails/:id");
  const trailId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();

  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number; correct: number; total: number; passed: boolean; minPassRate: number; attemptNumber: number;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: trail, isLoading } = trpc.trails.getById.useQuery({ id: trailId }, { enabled: trailId > 0 });
  const { data: enrollment, refetch: refetchEnrollment } = trpc.trails.getEnrollment.useQuery(
    { trailId }, { enabled: trailId > 0 && !!user }
  );
  const { data: moduleQuestions, isLoading: loadingQuestions } = trpc.trails.getModuleQuestions.useQuery(
    { moduleId: activeModuleId!, trailId },
    { enabled: activeModuleId !== null && !!enrollment }
  );

  const enrollMutation = trpc.trails.enroll.useMutation({
    onSuccess: () => { refetchEnrollment(); toast.success("Matriculado com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.trails.submitModuleAnswers.useMutation({
    onSuccess: (result) => {
      setQuizResult(result);
      setQuizSubmitted(true);
      refetchEnrollment();
      utils.trails.getEnrollment.invalidate({ trailId });
      if (result.passed) toast.success(`Módulo concluído! ${result.score}% de acerto`);
      else toast.error(`Não passou. ${result.score}% de acerto (mínimo: ${result.minPassRate}%)`);
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
        <Skeleton className="h-32 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
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
    const progress = getModuleProgress(activeModuleId);

    return (
      <div className="min-h-screen bg-background">
        <div className="container py-6 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setActiveModuleId(null)} className="gap-1">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">{trail.title}</p>
              <h2 className="font-semibold">{mod?.title}</h2>
            </div>
          </div>

          {/* Result Screen */}
          {quizSubmitted && quizResult && (
            <Card className={`mb-6 border-2 ${quizResult.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <CardContent className="p-6 text-center">
                {quizResult.passed ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                )}
                <h3 className="text-xl font-bold mb-1">
                  {quizResult.passed ? "Módulo Concluído!" : "Não passou desta vez"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {quizResult.correct} de {quizResult.total} corretas — {quizResult.score}%
                  {!quizResult.passed && ` (mínimo: ${quizResult.minPassRate}%)`}
                </p>
                <div className="flex gap-3 justify-center">
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
              {!quizSubmitted && (
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>{Object.keys(quizAnswers).length} / {moduleQuestions.length} respondidas</span>
                  <span>Mínimo para passar: {mod?.minPassRate}%</span>
                </div>
              )}
              {(moduleQuestions as ModuleQuestion[]).map((q, idx) => (
                <Card key={q.id} className={`${quizSubmitted ? "opacity-80" : ""}`}>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">Questão {idx + 1}</div>
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
                  className="w-full"
                  size="lg"
                >
                  {submitMutation.isPending ? "Enviando..." : "Enviar Respostas"}
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
  const totalModules = (trail.modules as unknown[]).length;
  const passedModules = enrollment?.moduleProgress?.filter((p: { status: string }) => p.status === "passed").length ?? 0;
  const progressPercent = totalModules > 0 ? Math.round((passedModules / totalModules) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <Link href="/trails">
          <Button variant="ghost" size="sm" className="gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" />Trilhas
          </Button>
        </Link>

        {/* Trail Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{trail.title}</h1>
                {trail.description && <p className="text-muted-foreground">{trail.description}</p>}
              </div>
              {enrollment?.status === "completed" && (
                <Trophy className="h-8 w-8 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" />{totalModules} módulos
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />{trail.totalHours}h estimadas
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />{trail.passingScore}% para passar
              </Badge>
            </div>
            {enrollment ? (
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{passedModules} / {totalModules} módulos concluídos</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            ) : (
              <Button
                onClick={() => enrollMutation.mutate({ trailId })}
                disabled={enrollMutation.isPending || !user}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                {!user ? "Faça login para se matricular" : enrollMutation.isPending ? "Matriculando..." : "Iniciar Trilha"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Modules List */}
        <h2 className="text-lg font-semibold mb-3">Módulos</h2>
        <div className="space-y-3">
          {(trail.modules as Array<{
            id: number; title: string; summary?: string | null;
            questionCount: number; minPassRate: number; difficulty: string; order: number;
          }>).map((mod, idx) => {
            const progress = getModuleProgress(mod.id);
            const status: ModuleStatus = progress?.status ?? "locked";
            const isAvailable = status === "available" || status === "failed";
            const isPassed = status === "passed";
            const isLocked = status === "locked" || !enrollment;

            return (
              <Card key={mod.id} className={`transition-all ${isLocked ? "opacity-60" : "hover:border-primary/40"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isPassed ? "bg-emerald-500/20 text-emerald-400" :
                      isAvailable ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isPassed ? <CheckCircle2 className="h-4 w-4" /> :
                       isLocked ? <Lock className="h-4 w-4" /> :
                       <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm">{mod.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABELS[mod.difficulty] ?? mod.difficulty}
                        </Badge>
                      </div>
                      {mod.summary && <p className="text-xs text-muted-foreground line-clamp-1">{mod.summary}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{mod.questionCount} questões</span>
                        <span>Mín. {mod.minPassRate}% para passar</span>
                        {progress && <span className="text-primary">Tentativas: {progress.attempts}</span>}
                        {(progress?.bestScore ?? 0) > 0 && <span>Melhor: {progress?.bestScore}%</span>}
                      </div>
                    </div>
                    {isAvailable && (
                      <Button size="sm" onClick={() => handleStartModule(mod.id)} className="gap-1 shrink-0">
                        {status === "failed" ? <RefreshCw className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                        {status === "failed" ? "Repetir" : "Iniciar"}
                      </Button>
                    )}
                    {isPassed && (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs shrink-0">
                        <Zap className="h-3 w-3" />
                        <span>{progress?.bestScore ?? 0}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Final Exam CTA */}
        {enrollment && passedModules === totalModules && totalModules > 0 && enrollment.status !== "completed" && (
          <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-1">Todos os módulos concluídos!</h3>
              <p className="text-muted-foreground mb-4">
                Você está pronto para o exame final. Precisa de {trail.passingScore}% para obter o certificado.
              </p>
              <Link href={`/trails/${trailId}/exam`}>
                <Button className="gap-2">
                  <Star className="h-4 w-4" />Fazer Exame Final
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {enrollment?.status === "completed" && (
          <Card className="mt-6 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-1">Trilha Concluída!</h3>
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

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil", medium: "Médio", hard: "Difícil", mixed: "Misto",
};
