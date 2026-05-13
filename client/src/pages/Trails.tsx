import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Clock, CheckCircle2, Crown, Lock, PlayCircle,
  Trophy, ChevronRight, GraduationCap, Star, Zap,
  Flame, TrendingUp, Award, Shield,
} from "lucide-react";

// ─── XP / Level helpers (mirrors server/db.ts) ───────────────────────────────
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

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ percent, size = 56, stroke = 4, color = "#10b981" }: {
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

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString("pt-BR")}</>;
}

const STATUS_LABELS: Record<string, string> = {
  enrolled: "Matriculado", in_progress: "Em andamento", completed: "Concluído",
};
const STATUS_COLORS: Record<string, string> = {
  enrolled:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function Trails() {
  const { user } = useAuth();
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | undefined>();

  const { data: trails, isLoading } = trpc.trails.list.useQuery(
    selectedDiscipline ? { disciplineId: selectedDiscipline } : undefined
  );
  const { data: myEnrollments } = trpc.trails.myEnrollments.useQuery(undefined, { enabled: !!user });
  const { data: disciplines } = trpc.questions.disciplines.useQuery();
  const { data: profile } = trpc.gamification.myProfile.useQuery(undefined, { enabled: !!user });

  const enrollmentMap = new Map(myEnrollments?.map(e => [e.trailId, e]) ?? []);

  const xp = (profile as { xp?: number } | undefined)?.xp ?? 0;
  const level = (profile as { level?: number } | undefined)?.level ?? 1;
  const { current: lvlInfo, next: nextLvl, progressToNext } = getLevelInfo(xp);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 max-w-5xl">
          <Skeleton className="h-32 mb-6 rounded-2xl" />
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-56" />)}
          </div>
        </div>
      </div>
    );
  }

  const isFree = (user as any)?.plan === "free";

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-5xl">

        {/* ── Paywall banner for free users ─────────────────────────────── */}
        {user && isFree && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
            <Crown className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-sans font-medium text-yellow-300 mb-1">
                Trilhas de estudo são exclusivas para assinantes
              </p>
              <p className="text-xs font-sans text-yellow-400/80 mb-2">
                Faça upgrade para acessar trilhas ilimitadas, simulados e muito mais.
              </p>
              <Link href="/pricing">
                <Button size="sm" className="bg-yellow-500 text-black hover:bg-yellow-400 font-sans text-xs gap-1">
                  <Crown className="h-3 w-3" />
                  Ver planos
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── XP / Level Hero Banner ─────────────────────────────────────── */}
        {user && (
          <div
            className="relative overflow-hidden rounded-2xl mb-8 p-6"
            style={{ background: `linear-gradient(135deg, ${lvlInfo.color}22 0%, ${lvlInfo.color}08 100%)`, border: `1px solid ${lvlInfo.color}33` }}
          >
            {/* decorative glow */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
              style={{ background: lvlInfo.color, filter: "blur(40px)" }} />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Level badge */}
              <div className="relative shrink-0">
                <ProgressRing percent={progressToNext} size={72} stroke={5} color={lvlInfo.color} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl leading-none">{lvlInfo.icon}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">Nv.{level}</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xl font-extrabold" style={{ color: lvlInfo.color }}>
                    {lvlInfo.name}
                  </span>
                  <Badge variant="outline" className="text-xs gap-1" style={{ borderColor: `${lvlInfo.color}44`, color: lvlInfo.color }}>
                    <Zap className="h-3 w-3" />
                    <AnimatedNumber value={xp} /> XP
                  </Badge>
                </div>
                {nextLvl ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      {nextLvl.xpRequired - xp} XP para {nextLvl.icon} {nextLvl.name}
                    </p>
                    <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden max-w-xs">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{ width: `${progressToNext}%`, background: lvlInfo.color }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-amber-400 font-semibold">🌟 Nível máximo atingido!</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-center shrink-0">
                <div>
                  <p className="text-lg font-bold">{myEnrollments?.filter(e => e.status === "completed").length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{myEnrollments?.filter(e => e.status === "in_progress").length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Em andamento</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{myEnrollments?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Matrículas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Page Title ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Trilhas do Conhecimento</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Percursos estruturados com módulos progressivos. Avance respondendo questões e conquiste certificados.
          </p>
        </div>

        {/* ── My Active Trails ───────────────────────────────────────────── */}
        {myEnrollments && myEnrollments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Minhas Trilhas
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {myEnrollments.map(e => {
                const pct = e.totalModules > 0 ? Math.round((e.passedModules / e.totalModules) * 100) : 0;
                return (
                  <Link key={e.id} href={`/trails/${e.trailId}`}>
                    <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* ring */}
                          <div className="relative shrink-0">
                            <ProgressRing
                              percent={pct}
                              size={48}
                              stroke={4}
                              color={e.status === "completed" ? "#10b981" : "#3b82f6"}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                              {e.status === "completed"
                                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                : `${pct}%`}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug mb-1 group-hover:text-primary transition-colors">
                              {e.trailTitle}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[e.status] ?? ""}`}>
                                {STATUS_LABELS[e.status] ?? e.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {e.passedModules}/{e.totalModules} módulos
                              </span>
                            </div>
                          </div>

                          {e.status === "completed"
                            ? <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
                            : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Discipline Filter ──────────────────────────────────────────── */}
        {disciplines && disciplines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedDiscipline(undefined)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedDiscipline
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todas
            </button>
            {(disciplines as Array<{ id: number; namePt: string; icon?: string; color?: string }>).map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDiscipline(d.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDiscipline === d.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d.icon && <span className="mr-1">{d.icon}</span>}
                {d.namePt}
              </button>
            ))}
          </div>
        )}

        {/* ── Trails Grid ────────────────────────────────────────────────── */}
        {!trails || trails.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma trilha disponível no momento.</p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {(trails as Array<{
              id: number; title: string; description?: string | null;
              totalHours: number; passingScore: number; moduleCount: number;
            }>).map(trail => {
              const enrollment = enrollmentMap.get(trail.id);
              const pct = enrollment
                ? (enrollment.totalModules > 0
                  ? Math.round((enrollment.passedModules / enrollment.totalModules) * 100)
                  : 0)
                : 0;
              const isCompleted = enrollment?.status === "completed";
              const isActive = enrollment && !isCompleted;
              // Estimated XP: moduleCount × avg 30 correct × 3 XP
              const estimatedXp = trail.moduleCount * 30 * 3;

              return (
                <Link key={trail.id} href={`/trails/${trail.id}`}>
                  <Card className={`cursor-pointer transition-all hover:shadow-lg h-full group relative overflow-hidden ${
                    isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isActive
                      ? "border-primary/30 hover:border-primary/60"
                      : "hover:border-primary/40"
                  }`}>
                    {/* completed shimmer */}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                          {trail.title}
                        </CardTitle>
                        {isCompleted && <Trophy className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />}
                      </div>
                      {trail.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{trail.description}</p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <Badge variant="outline" className="text-xs gap-1">
                          <BookOpen className="h-3 w-3" />
                          {trail.moduleCount} módulos
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {trail.totalHours}h
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="h-3 w-3" />
                          {trail.passingScore}% mín.
                        </Badge>
                        {/* XP reward badge */}
                        <Badge className="text-xs gap-1 bg-amber-500/10 text-amber-400 border-amber-500/20 border">
                          <Zap className="h-3 w-3" />
                          ~{estimatedXp.toLocaleString("pt-BR")} XP
                        </Badge>
                      </div>

                      {/* Progress or CTA */}
                      {enrollment ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              {enrollment.passedModules}/{enrollment.totalModules} módulos
                            </span>
                            <span className={`font-semibold ${
                              isCompleted ? "text-emerald-400" :
                              pct >= 50 ? "text-primary" : "text-amber-400"
                            }`}>
                              {isCompleted ? "✓ Concluído" : `${pct}%`}
                            </span>
                          </div>
                          {/* Segmented progress bar */}
                          <div className="flex gap-0.5 h-2">
                            {Array.from({ length: enrollment.totalModules }).map((_, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-full transition-all ${
                                  i < enrollment.passedModules
                                    ? isCompleted ? "bg-emerald-500" : "bg-primary"
                                    : "bg-muted/40"
                                }`}
                              />
                            ))}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[enrollment.status] ?? ""}`}>
                            {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <PlayCircle className="h-4 w-4" />
                          Iniciar Trilha
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
