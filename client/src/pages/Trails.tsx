import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Clock, CheckCircle2, Lock, PlayCircle,
  Trophy, ChevronRight, GraduationCap, Star,
} from "lucide-react";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil", medium: "Médio", hard: "Difícil", mixed: "Misto",
};
const STATUS_LABELS: Record<string, string> = {
  enrolled: "Matriculado", in_progress: "Em andamento", completed: "Concluído",
};
const STATUS_COLORS: Record<string, string> = {
  enrolled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function Trails() {
  const { user } = useAuth();
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | undefined>();

  const { data: trails, isLoading } = trpc.trails.list.useQuery(
    selectedDiscipline ? { disciplineId: selectedDiscipline } : undefined
  );
  const { data: myEnrollments } = trpc.trails.myEnrollments.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: disciplines } = trpc.questions.disciplines.useQuery();

  const enrollmentMap = new Map(myEnrollments?.map(e => [e.trailId, e]) ?? []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-5xl">
        {/* Header */}
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

        {/* My Enrollments Summary */}
        {myEnrollments && myEnrollments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Minhas Trilhas
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {myEnrollments.map(e => (
                <Link key={e.id} href={`/trails/${e.trailId}`}>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{e.trailTitle}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[e.status] ?? ""}`}>
                            {STATUS_LABELS[e.status] ?? e.status}
                          </span>
                        </div>
                        {e.status === "completed" ? (
                          <Trophy className="h-5 w-5 text-amber-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{e.passedModules} / {e.totalModules} módulos</span>
                          <span>{e.totalModules > 0 ? Math.round((e.passedModules / e.totalModules) * 100) : 0}%</span>
                        </div>
                        <Progress
                          value={e.totalModules > 0 ? (e.passedModules / e.totalModules) * 100 : 0}
                          className="h-1.5"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Discipline Filter */}
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
            {disciplines.map((d: { id: number; namePt: string }) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiscipline(d.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDiscipline === d.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d.namePt}
              </button>
            ))}
          </div>
        )}

        {/* Trails Grid */}
        {!trails || trails.length === 0 ? (
          <Card className="p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma trilha disponível no momento.</p>
            <p className="text-sm text-muted-foreground mt-1">
              O coordenador ainda não criou trilhas para esta disciplina.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(trails as Array<{
              id: number; title: string; description?: string | null;
              totalHours: number; passingScore: number; moduleCount: number;
            }>).map((trail) => {
              const enrollment = enrollmentMap.get(trail.id);
              return (
                <Link key={trail.id} href={`/trails/${trail.id}`}>
                  <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base leading-snug">{trail.title}</CardTitle>
                        {enrollment?.status === "completed" && (
                          <Trophy className="h-5 w-5 text-amber-400 shrink-0 ml-2" />
                        )}
                      </div>
                      {trail.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{trail.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className="text-xs gap-1">
                          <BookOpen className="h-3 w-3" />
                          {trail.moduleCount} módulos
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {trail.totalHours}h estimadas
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Star className="h-3 w-3" />
                          {trail.passingScore}% para passar
                        </Badge>
                      </div>

                      {enrollment ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{enrollment.passedModules}/{enrollment.totalModules} módulos concluídos</span>
                            <span className={`font-medium ${
                              enrollment.status === "completed" ? "text-emerald-400" : "text-primary"
                            }`}>
                              {STATUS_LABELS[enrollment.status]}
                            </span>
                          </div>
                          <Progress
                            value={enrollment.totalModules > 0
                              ? (enrollment.passedModules / enrollment.totalModules) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-2">
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
