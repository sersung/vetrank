import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { QuestionImport, type ParsedMCQuestion } from "@/components/QuestionImport";
import { AIQuestionExtractor, type AIExtractedQuestion } from "@/components/AIQuestionExtractor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  FileText,
  Upload,
  ClipboardList,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

// ─── Assignment status badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-sans">
        <CheckCircle className="h-3 w-3 mr-1" />
        Aprovado
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-sans">
        <XCircle className="h-3 w-3 mr-1" />
        Rejeitado
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-sans">
      Pendente
    </Badge>
  );
}

// ─── My Assignments tab ───────────────────────────────────────────────────────
function MyAssignments() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, refetch, isLoading } = trpc.validation.listMyAssignments.useQuery({
    status: statusFilter,
    page: 1,
    pageSize: 30,
  });

  const updateAssignment = trpc.validation.updateAssignment.useMutation({
    onSuccess: () => {
      toast.success("Questão avaliada com sucesso");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDecision = async (assignmentId: number, status: "approved" | "rejected") => {
    await updateAssignment.mutateAsync({
      assignmentId,
      status,
      notes: notes[assignmentId] || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            className="font-sans text-xs"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && data?.rows.length === 0 && (
        <div className="text-center py-10 text-muted-foreground font-sans">
          Nenhuma atribuição {statusFilter !== "all" ? `com status "${statusFilter}"` : ""} encontrada.
        </div>
      )}

      {data?.rows.map((a: any) => (
        <Card key={a.id} className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans line-clamp-2">
                  {a.question?.textPt ?? `Questão #${a.questionId}`}
                </p>
                <div className="flex gap-2 mt-1">
                  {a.question?.difficulty && (
                    <Badge variant="outline" className="text-xs font-sans">{a.question.difficulty}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-sans">{a.questionType}</Badge>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          </CardHeader>

          {a.status === "pending" && (
            <CardContent className="pt-0 space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground font-sans p-0 h-auto"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              >
                {expanded === a.id ? "Ocultar detalhes" : "Ver detalhes da questão"}
              </Button>

              {expanded === a.id && a.question && (
                <div className="bg-background rounded-lg p-3 border border-border/50 text-sm font-sans space-y-2">
                  <p className="font-medium">{a.question.textPt}</p>
                  {a.question.options && (
                    <ul className="space-y-1 mt-2">
                      {(Array.isArray(a.question.options)
                        ? a.question.options
                        : JSON.parse(a.question.options)
                      ).map((opt: any) => (
                        <li
                          key={opt.id}
                          className={`text-xs p-1.5 rounded ${opt.id === a.question.correctOption ? "bg-green-500/10 text-green-400" : "text-muted-foreground"}`}
                        >
                          <span className="font-bold">{opt.id})</span> {opt.textPt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.question.expectedAnswerPt && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground">Resposta esperada:</p>
                      <p className="text-xs mt-1">{a.question.expectedAnswerPt}</p>
                    </div>
                  )}
                </div>
              )}

              <Textarea
                placeholder="Observações (opcional)..."
                className="text-sm font-sans resize-none h-16 bg-background"
                value={notes[a.id] ?? ""}
                onChange={(e) => setNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-sans flex-1"
                  onClick={() => handleDecision(a.id, "approved")}
                  disabled={updateAssignment.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-sans flex-1"
                  onClick={() => handleDecision(a.id, "rejected")}
                  disabled={updateAssignment.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </CardContent>
          )}

          {a.status !== "pending" && a.notes && (
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground font-sans italic">Nota: {a.notes}</p>
            </CardContent>
          )}
        </Card>
      ))}

      {data && data.total > 30 && (
        <p className="text-xs text-muted-foreground font-sans text-center">
          Mostrando 30 de {data.total} atribuições.
        </p>
      )}
    </div>
  );
}

// ─── My Questions tab (legacy) ────────────────────────────────────────────────
function MyQuestions() {
  const { data: myQuestions, isLoading } = trpc.teacher.myQuestions.useQuery({ status: "all", limit: 50, offset: 0 });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myQuestions?.length === 0 && (
        <div className="text-center py-10 text-muted-foreground font-sans">
          Você ainda não criou nenhuma questão.
        </div>
      )}
      {myQuestions?.map((q: any) => (
        <div key={q.id} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-sans line-clamp-2">{q.textPt}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-sans">{q.difficulty}</Badge>
              <Badge
                className={`text-xs font-sans border ${
                  q.status === "approved"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : q.status === "rejected"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }`}
              >
                {q.status === "approved" ? "Aprovada" : q.status === "rejected" ? "Rejeitada" : "Pendente"}
              </Badge>
              {q.isValidated && (
                <Badge className="text-xs font-sans bg-green-600/20 text-green-400 border border-green-600/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Validada
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherPanel() {
  const { user } = useAuth();
  const allowed = ["teacher", "coordinator", "superuser", "admin"];

  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <BookOpen className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground font-sans">Apenas professores podem acessar esta área.</p>
          <Link href="/">
            <Button className="mt-4 font-sans">Voltar ao início</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-serif text-3xl font-bold">Painel do Professor</h1>
            <p className="text-muted-foreground font-sans text-sm">
              Importe questões e gerencie suas atribuições de validação.
            </p>
          </div>
        </div>

        <Tabs defaultValue="assignments">
          <TabsList className="mb-6 bg-card border border-border/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="assignments" className="font-sans gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              Minhas Atribuições
            </TabsTrigger>
            <TabsTrigger value="import" className="font-sans gap-1">
              <Upload className="h-3.5 w-3.5" />
              Importar Questões
            </TabsTrigger>
            <TabsTrigger value="my" className="font-sans gap-1">
              <FileText className="h-3.5 w-3.5" />
              Minhas Questões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Minhas Atribuições de Validação</h2>
              <p className="text-sm text-muted-foreground font-sans">
                Questões atribuídas a você pelo coordenador para revisão e validação.
              </p>
            </div>
            <MyAssignments />
          </TabsContent>

          <TabsContent value="import">
            <TeacherImportTab />
          </TabsContent>

          <TabsContent value="my">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Minhas Questões</h2>
              <p className="text-sm text-muted-foreground font-sans">
                Questões que você criou e seu status de validação.
              </p>
            </div>
            <MyQuestions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Teacher Import Tab ───────────────────────────────────────────────────────
function TeacherImportTab() {
  const [preloadedRows, setPreloadedRows] = useState<ParsedMCQuestion[]>([]);
  const [activeSection, setActiveSection] = useState<"file" | "ai">("file");

  const handleAIExtracted = (questions: AIExtractedQuestion[]) => {
    const mapped = questions.map((q) => ({
      textPt: q.textPt,
      disciplineId: q.disciplineId ?? 0,
      subjectTag: q.disciplineSuggestion,
      author: q.author ?? "",
      year: q.year,
      difficulty: q.difficulty,
      questionType: q.questionType as ParsedMCQuestion["questionType"],
      optA: q.optA,
      optB: q.optB,
      optC: q.optC,
      optD: q.optD,
      optE: q.optE,
      correctOption: q.correctOption,
      explanationPt: q.explanationPt,
      assertion1: q.assertion1,
      assertion2: q.assertion2,
      _rowIndex: q._rowIndex,
      _errors: q._errors,
      _valid: q._valid,
    })) as ParsedMCQuestion[];
    setPreloadedRows(mapped);
    setActiveSection("file");
    toast.success(`${mapped.length} questões carregadas na pré-visualização de importação`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold mb-1">Importar Questões</h2>
        <p className="text-sm text-muted-foreground font-sans">
          Importe questões em lote via CSV, XLSX ou JSON — ou use a IA para extrair automaticamente de PDFs e arquivos Word.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeSection === "file" ? "default" : "outline"}
          className="font-sans gap-1"
          onClick={() => setActiveSection("file")}
        >
          <Upload className="h-3.5 w-3.5" />
          CSV / XLSX / JSON
        </Button>
        <Button
          size="sm"
          variant={activeSection === "ai" ? "default" : "outline"}
          className="font-sans gap-1"
          onClick={() => setActiveSection("ai")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Extrair com IA (PDF / Word)
        </Button>
      </div>

      {activeSection === "ai" && (
        <AIQuestionExtractor onQuestionsExtracted={handleAIExtracted} />
      )}

      {activeSection === "file" && (
        <QuestionImport
          onImportComplete={(count) => toast.success(`${count} questões importadas com sucesso`)}
          preloadedRows={preloadedRows.length > 0 ? preloadedRows : undefined}
        />
      )}
    </div>
  );
}
