import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  Crown,
  FlaskConical,
  Loader2,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import QuestionRenderer from "@/components/QuestionRenderer";

type ExamState = "config" | "taking" | "results";

interface ExamQuestion {
  id: number;
  textPt: string;
  textEn?: string | null;
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  explanationPt?: string | null;
  explanationEn?: string | null;
  difficulty: string;
  questionType?: string;
  assertion1?: string | null;
  assertion2?: string | null;
  formatData?: any;
  disciplineName?: string;
  subjectTag?: string | null;
  author?: string | null;
  year?: number | null;
}

export default function ExamPage() {
  const t = useT();
  const { language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const [examState, setExamState] = useState<ExamState>("config");
  const [examId, setExamId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState<Record<number, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});

  // Config
  const [disciplineIds, setDisciplineIds] = useState<number[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("mixed");
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);

  const { data: disciplines } = trpc.questions.disciplines.useQuery();
  const { data: distinctAuthors } = trpc.questions.distinctAuthors.useQuery();
  const { data: distinctYears } = trpc.questions.distinctYears.useQuery();
  // Load subjects for all selected disciplines
  const { data: allSubjects } = trpc.questions.allSubjects.useQuery();
  const filteredSubjects = allSubjects?.filter((s) =>
    disciplineIds.length === 0 || disciplineIds.includes(s.disciplineId)
  );
  const startExam = trpc.exams.start.useMutation();
  const submitAnswer = trpc.exams.submitAnswer.useMutation();
  const completeExam = trpc.exams.complete.useMutation();
  const explainAi = trpc.ai.explainAnswer.useMutation();
  const utils = trpc.useUtils();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spentRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (examState === "taking") {
      spentRef.current = setInterval(() => setTimeSpent((s) => s + 1), 1000);
      if (timeLeft !== null) {
        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t === null || t <= 1) {
              handleComplete();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spentRef.current) clearInterval(spentRef.current);
    };
  }, [examState]);

  const handleStart = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    try {
      const result = await startExam.mutateAsync({
        disciplineIds: disciplineIds.length > 0 ? disciplineIds : undefined,
        subjectId: subjectId && subjectId !== "all" ? parseInt(subjectId) : undefined,
        author: author && author !== "all" ? author : undefined,
        year: year && year !== "all" ? parseInt(year) : undefined,
        difficulty: difficulty as "easy" | "medium" | "hard" | "mixed",
        questionCount,
        timeLimitMinutes: timeLimitMinutes ?? undefined,
      });
      setExamId(result.examId);
      setQuestions(result.questions as ExamQuestion[]);
      setCurrentIdx(0);
      setAnswers({});
      setRevealed({});
      if (timeLimitMinutes) setTimeLeft(timeLimitMinutes * 60);
      setTimeSpent(0);
      setExamState("taking");
    } catch (err: any) {
      toast.error(err.message || t("error"));
    }
  };

  const handleAnswer = async (questionId: number, option: string) => {
    if (revealed[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    if (examId) {
      await submitAnswer.mutateAsync({
        examId,
        questionId,
        selectedOption: option,
      });
    }
  };

  const handleComplete = async () => {
    if (!examId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (spentRef.current) clearInterval(spentRef.current);
    try {
      const result = await completeExam.mutateAsync({ examId, timeSpentSeconds: timeSpent });
      setResults(result);
      setExamState("results");
      utils.gamification.myProfile.invalidate();
      if (result.newBadges?.length > 0) {
        result.newBadges.forEach((b: any) => {
          toast.success(`🏅 ${language === "pt" ? "Badge desbloqueado" : "Badge unlocked"}: ${language === "pt" ? b.namePt : b.nameEn}`);
        });
      }
    } catch (err: any) {
      toast.error(err.message || t("error"));
    }
  };

  const handleAiExplain = async (questionId: number, selectedOption: string) => {
    setLoadingAi((prev) => ({ ...prev, [questionId]: true }));
    try {
      const result = await explainAi.mutateAsync({
        questionId,
        selectedOption,
        language: language as "pt" | "en",
      });
      setAiExplanation((prev) => ({ ...prev, [questionId]: result.explanation }));
    } catch {
      toast.error(t("error"));
    } finally {
      setLoadingAi((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  if (examState === "config") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-10 max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 mx-auto mb-4">
              <FlaskConical className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2">{t("exam_title")}</h1>
            <p className="text-muted-foreground font-sans">
              {language === "pt" ? "Configure seu simulado personalizado" : "Configure your personalized mock exam"}
            </p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-8 space-y-6">
            {/* Disciplines — multi-select checkboxes */}
            <div>
              <label className="text-sm font-medium font-sans mb-3 block">
                {language === "pt" ? "Disciplinas" : "Disciplines"}
                {disciplineIds.length > 0 && (
                  <span className="ml-2 text-xs text-primary font-normal">
                    ({disciplineIds.length} {language === "pt" ? "selecionada(s)" : "selected"})
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {disciplines?.map((d) => {
                  const checked = disciplineIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDisciplineIds((prev) =>
                          checked ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        );
                        setSubjectId("");
                      }}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-sans transition-all ${
                        checked
                          ? "bg-primary/20 border-primary/50 text-primary font-medium"
                          : "bg-background border-border/50 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {language === "pt" ? d.namePt : d.nameEn}
                    </button>
                  );
                })}
              </div>
              {disciplineIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setDisciplineIds([]); setSubjectId(""); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground font-sans underline"
                >
                  {language === "pt" ? "Limpar seleção" : "Clear selection"}
                </button>
              )}
            </div>

            {/* Subject — filtered by selected disciplines */}
            <div>
              <label className="text-sm font-medium font-sans mb-2 block">
                {language === "pt" ? "Assunto" : "Subject"}
              </label>
              <Select
                value={subjectId || "all"}
                onValueChange={(v) => setSubjectId(v === "all" ? "" : v)}
                disabled={!filteredSubjects || filteredSubjects.length === 0}
              >
                <SelectTrigger className="bg-background border-border/50 font-sans">
                  <SelectValue placeholder={language === "pt" ? "Todos os assuntos" : "All subjects"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "pt" ? "Todos os assuntos" : "All subjects"}</SelectItem>
                  {filteredSubjects?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {language === "pt" ? s.namePt : s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Author */}
            <div>
              <label className="text-sm font-medium font-sans mb-2 block">
                {language === "pt" ? "Autor" : "Author"}
              </label>
              <Select value={author || "all"} onValueChange={(v) => setAuthor(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-background border-border/50 font-sans">
                  <SelectValue placeholder={language === "pt" ? "Todos os autores" : "All authors"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "pt" ? "Todos os autores" : "All authors"}</SelectItem>
                  {distinctAuthors?.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <label className="text-sm font-medium font-sans mb-2 block">
                {language === "pt" ? "Ano" : "Year"}
              </label>
              <Select value={year || "all"} onValueChange={(v) => setYear(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-background border-border/50 font-sans">
                  <SelectValue placeholder={language === "pt" ? "Todos os anos" : "All years"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "pt" ? "Todos os anos" : "All years"}</SelectItem>
                  {distinctYears?.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-medium font-sans mb-2 block">{t("exam_difficulty")}</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-background border-border/50 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">{t("exam_mixed")}</SelectItem>
                  <SelectItem value="easy">{t("exam_easy")}</SelectItem>
                  <SelectItem value="medium">{t("exam_medium")}</SelectItem>
                  <SelectItem value="hard">{t("exam_hard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question count */}
            <div>
              <label className="text-sm font-medium font-sans mb-3 block">
                {t("exam_count")}: <span className="text-primary font-bold">{questionCount}</span>
              </label>
              <Slider
                min={5}
                max={60}
                step={5}
                value={[questionCount]}
                onValueChange={([v]) => setQuestionCount(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1 font-sans">
                <span>5</span><span>60</span>
              </div>
            </div>

            {/* Timer */}
            <div>
              <label className="text-sm font-medium font-sans mb-2 block">{t("exam_timer")}</label>
              <Select
                value={timeLimitMinutes === null ? "none" : String(timeLimitMinutes)}
                onValueChange={(v) => setTimeLimitMinutes(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger className="bg-background border-border/50 font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("exam_no_timer")}</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paywall banner for free users */}
            {isAuthenticated && (user as any)?.plan === "free" && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                <Crown className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-sans font-medium text-yellow-300 mb-1">
                    {language === "pt" ? "Simulados são exclusivos para assinantes" : "Mock exams are exclusive to subscribers"}
                  </p>
                  <p className="text-xs font-sans text-yellow-400/80 mb-2">
                    {language === "pt" ? "Faça upgrade para acessar simulados ilimitados e muito mais." : "Upgrade to access unlimited mock exams and more."}
                  </p>
                  <Link href="/pricing">
                    <Button size="sm" className="bg-yellow-500 text-black hover:bg-yellow-400 font-sans text-xs gap-1">
                      <Crown className="h-3 w-3" />
                      {language === "pt" ? "Ver planos" : "View plans"}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary gap-2 font-sans"
              onClick={handleStart}
              disabled={startExam.isPending || (isAuthenticated && (user as any)?.plan === "free")}
            >
              {startExam.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {t("exam_start")}
            </Button>

            {!isAuthenticated && (
              <p className="text-center text-sm text-muted-foreground font-sans">
                {t("login_required")}{" "}
                <button onClick={() => (window.location.href = getLoginUrl())} className="text-primary hover:underline">
                  {t("login_btn")}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── TAKING ──────────────────────────────────────────────────────────────────
  if (examState === "taking" && currentQuestion) {
    const options = currentQuestion.options;
    const selectedAnswer = answers[currentQuestion.id];

    return (
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="container py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium font-sans">
                  {t("exam_question")} <span className="text-primary font-bold">{currentIdx + 1}</span> {t("exam_of")} {questions.length}
                </span>
                <Badge variant="outline" className="font-sans text-xs">
                  {answeredCount}/{questions.length} {language === "pt" ? "respondidas" : "answered"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timeLeft < 60 ? "text-red-400" : "text-primary"}`}>
                    <Clock className="h-4 w-4" />
                    {formatTime(timeLeft)}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleComplete}
                  disabled={completeExam.isPending}
                  className="font-sans text-xs"
                >
                  {t("exam_submit")}
                </Button>
              </div>
            </div>
            <Progress value={progress} className="mt-2 h-1.5" />
          </div>
        </div>

        <div className="container py-8 max-w-3xl mx-auto">
          {/* Question + Options via universal renderer */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 mb-6">
            <QuestionRenderer
              question={{
                id: currentQuestion.id,
                textPt: currentQuestion.textPt,
                textEn: currentQuestion.textEn ?? undefined,
                questionType: currentQuestion.questionType,
                options: options,
                correctOption: currentQuestion.correctOption,
                explanationPt: currentQuestion.explanationPt ?? undefined,
                explanationEn: currentQuestion.explanationEn ?? undefined,
                assertion1: currentQuestion.assertion1 ?? undefined,
                assertion2: currentQuestion.assertion2 ?? undefined,
                formatData: currentQuestion.formatData,
                difficulty: currentQuestion.difficulty,
                disciplineName: currentQuestion.disciplineName,
                subjectTag: currentQuestion.subjectTag ?? undefined,
                author: currentQuestion.author ?? undefined,
                year: currentQuestion.year ?? undefined,
              }}
              selectedOption={selectedAnswer}
              answered={false}
              onAnswer={(optId) => handleAnswer(currentQuestion.id, optId)}
              language={language as "pt" | "en"}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="gap-2 font-sans"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("exam_prev")}
            </Button>

            {/* Question dots */}
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-6 w-6 rounded-full text-xs font-bold transition-colors ${
                    i === currentIdx
                      ? "bg-primary text-primary-foreground"
                      : answers[q.id]
                      ? "bg-primary/30 text-primary"
                      : "bg-accent text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {currentIdx < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-sans"
              >
                {t("exam_next")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completeExam.isPending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-sans"
              >
                {completeExam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {t("exam_submit")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (examState === "results" && results) {
    const accuracy = Math.round(results.accuracy);
    const wrong = questions.length - results.correctAnswers;

    return (
      <div className="min-h-screen bg-background">
        <div className="container py-10 max-w-3xl mx-auto">
          {/* Score card */}
          <div className="bg-card border border-border/50 rounded-2xl p-8 mb-8 text-center">
            <div className={`inline-flex h-20 w-20 items-center justify-center rounded-full mb-4 ${
              accuracy >= 70 ? "bg-green-500/15 border-2 border-green-500/40" : "bg-red-500/15 border-2 border-red-500/40"
            }`}>
              {accuracy >= 70 ? (
                <Trophy className="h-10 w-10 text-green-400" />
              ) : (
                <AlertCircle className="h-10 w-10 text-red-400" />
              )}
            </div>
            <h1 className="font-serif text-3xl font-bold mb-2">{t("exam_results_title")}</h1>
            <div className="font-serif text-6xl font-bold text-gradient mb-6">{accuracy}%</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t("exam_correct"), value: results.correctAnswers, icon: CheckCircle, color: "text-green-400" },
                { label: t("exam_wrong"), value: wrong, icon: XCircle, color: "text-red-400" },
                { label: t("exam_xp_earned"), value: `+${results.xpEarned}`, icon: Zap, color: "text-primary" },
                { label: t("exam_time_spent"), value: formatTime(timeSpent), icon: Clock, color: "text-cyan-400" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-accent/50 border border-border/30">
                  <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-1`} />
                  <div className={`font-serif text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-sans mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => setExamState("config")} className="gap-2 font-sans">
                <FlaskConical className="h-4 w-4" />
                {t("exam_new")}
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-sans"
                onClick={() => setLocation("/profile")}
              >
                <Trophy className="h-4 w-4" />
                {language === "pt" ? "Ver Perfil" : "View Profile"}
              </Button>
            </div>
          </div>

          {/* Review */}
          <h2 className="font-serif text-xl font-bold mb-4">{t("exam_review")}</h2>
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const opts = q.options;
              const selected = answers[q.id];
              const isCorrect = selected === q.correctOption;

              return (
                <div key={q.id} className={`rounded-xl border p-5 ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground font-sans mr-2">Q{idx + 1}</span>
                      <span className="text-sm font-sans leading-relaxed">
                        {language === "pt" ? q.textPt : (q.textEn || q.textPt)}
                      </span>
                    </div>
                  </div>

                  <div className="ml-8 space-y-1.5">
                    {opts.map((opt) => (
                      <div
                        key={opt.id}
                        className={`text-xs font-sans px-3 py-1.5 rounded-lg ${
                          opt.id === q.correctOption
                            ? "bg-green-500/20 text-green-300"
                            : opt.id === selected && !isCorrect
                            ? "bg-red-500/20 text-red-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold mr-2">{opt.id})</span>
                        {language === "pt" ? opt.textPt : (opt.textEn || opt.textPt)}
                        {opt.id === q.correctOption && (
                          <span className="ml-2 text-green-400">✓</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* AI Explanation */}
                  <div className="ml-8 mt-3">
                    {aiExplanation[q.id] ? (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary font-sans">AI</span>
                        </div>
                        <Streamdown className="text-xs text-muted-foreground font-sans">{aiExplanation[q.id]}</Streamdown>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAiExplain(q.id, selected || q.correctOption)}
                        disabled={loadingAi[q.id]}
                        className="text-xs text-primary hover:text-primary/80 gap-1.5 h-7 px-2 font-sans"
                      >
                        {loadingAi[q.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Brain className="h-3 w-3" />
                        )}
                        {t("exam_explain_ai")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
