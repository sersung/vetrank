import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { Link } from "wouter";
import {
  Target, TrendingUp, BookOpen, Flame, Trophy, Star,
  ArrowRight, AlertCircle, CheckCircle, Clock
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { LEVELS } from "@/lib/levels";

const DISCIPLINE_COLORS = ["#14b8a6", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  const { data: perf, isLoading } = trpc.practice.performanceDashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: badges } = trpc.gamification.badges.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-sm">
          <Target className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Faça login para ver seu desempenho</h2>
          <p className="text-muted-foreground mb-4">Acompanhe seu progresso, XP e estatísticas por disciplina.</p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>Entrar na plataforma</a>
          </Button>
        </Card>
      </div>
    );
  }

  const overall = perf?.overall;
  const byDiscipline = perf?.byDiscipline ?? [];
  const recentExams = perf?.recentExams ?? [];
  const xpHistory = perf?.xpHistory ?? [];

  const currentLevel = LEVELS.find(l => l.level === (user?.level ?? 1)) ?? LEVELS[0]!;
  const nextLevel = LEVELS.find(l => l.level === (user?.level ?? 1) + 1);
  const xpForNext = nextLevel ? nextLevel.xpRequired - (user?.xp ?? 0) : 0;
  const xpProgress = nextLevel
    ? Math.min(100, ((user?.xp ?? 0) - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) * 100)
    : 100;
  const LEVEL_ICONS: Record<number, string> = {
    1: "🩺", 2: "📋", 3: "🔬", 4: "⚕️", 5: "💡", 6: "🧬", 7: "📚", 8: "🏅", 9: "👑"
  };

  // Weak areas = disciplines with accuracy < 60%
  const weakAreas = byDiscipline.filter((d: any) => Number(d.accuracy) < 60);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
            Olá, {user?.name?.split(" ")[0] ?? "Estudante"} 👋
          </h1>
          <p className="text-muted-foreground">Aqui está seu desempenho na plataforma VetRank.</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Taxa de Acerto", value: `${overall?.accuracy ?? 0}%`, icon: Target, color: "text-green-400", sub: `${overall?.totalCorrect ?? 0} corretas` },
            { label: "Simulados", value: overall?.totalExams ?? 0, icon: BookOpen, color: "text-blue-400", sub: `${overall?.totalQuestions ?? 0} questões` },
            { label: "XP Total", value: (user?.xp ?? 0).toLocaleString(), icon: Star, color: "text-yellow-400", sub: currentLevel.name },
            { label: "Sequência", value: `${user?.streak ?? 0} dias`, icon: Flame, color: "text-orange-400", sub: "consecutivos" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Level Progress */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Nível Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                  {LEVEL_ICONS[currentLevel.level] ?? "⭐"}
                </div>
                <div>
                  <p className="font-bold text-lg">{currentLevel.name}</p>
                  <p className="text-xs text-muted-foreground">Nível {currentLevel.level}</p>
                </div>
              </div>
              <Progress value={xpProgress} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {nextLevel ? `${xpForNext} XP para ${nextLevel.name}` : "Nível máximo atingido! 🏆"}
              </p>
              <p className="text-sm font-medium mt-1">{(user?.xp ?? 0).toLocaleString()} XP</p>
            </CardContent>
          </Card>

          {/* Weak Areas */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Áreas para Melhorar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakAreas.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ótimo desempenho em todas as áreas!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weakAreas.slice(0, 4).map((d: any) => (
                    <div key={d.disciplineId} className="flex items-center justify-between">
                      <span className="text-sm truncate">{d.disciplineName}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={Number(d.accuracy)} className="w-16 h-1.5" />
                        <span className="text-xs text-red-400 w-10 text-right">{d.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                  <Link href="/practice">
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Praticar <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!badges || badges.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conquista ainda. Complete simulados para ganhar badges!</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {(badges as any[]).slice(0, 8).map((b: any) => (
                    <div key={b.id} title={b.namePt} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                        {b.icon}
                      </div>
                      <span className="text-xs text-center text-muted-foreground leading-tight">{b.namePt}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">Ver todas →</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Accuracy by Discipline */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Desempenho por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              {byDiscipline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Faça simulados para ver suas estatísticas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byDiscipline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="disciplineName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split(" ")[0]} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#1a2e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v: any) => [`${v}%`, "Acerto"]}
                    />
                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                      {byDiscipline.map((_: any, i: number) => (
                        <Cell key={i} fill={DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* XP History */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">XP nos Últimos 30 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {xpHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum XP ganho nos últimos 30 dias.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={xpHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#1a2e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v: any) => [v, "XP"]}
                    />
                    <Line type="monotone" dataKey="xp" stroke="#14b8a6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Exams */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Simulados Recentes</span>
              <Link href="/exams">
                <Button variant="ghost" size="sm" className="text-xs">Ver todos →</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Você ainda não fez nenhum simulado.</p>
                <Link href="/exams">
                  <Button>Fazer primeiro simulado</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentExams.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{e.disciplineName ?? "Misto"}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.correctAnswers}/{e.totalQuestions} corretas
                        {e.timeSpentSeconds ? ` · ${Math.round(e.timeSpentSeconds / 60)}min` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${Number(e.accuracy) >= 70 ? "text-green-400" : Number(e.accuracy) >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {e.accuracy}%
                      </p>
                      <p className="text-xs text-muted-foreground">+{e.xpEarned} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Praticar Questões", href: "/practice", icon: BookOpen, color: "bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20" },
            { label: "Novo Simulado", href: "/exams", icon: Target, color: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
            { label: "Ranking", href: "/leaderboard", icon: Trophy, color: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20" },
            { label: "Meu Perfil", href: "/profile", icon: Star, color: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20" },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className={`cursor-pointer border transition-colors ${a.color}`}>
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <a.icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
