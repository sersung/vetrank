import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { QuestionImport, type ParsedMCQuestion } from "@/components/QuestionImport";
import { AIQuestionExtractor, type AIExtractedQuestion } from "@/components/AIQuestionExtractor";
import { QuestionFilters, type QuestionFilterState, EMPTY_FILTERS } from "@/components/QuestionFilters";
import { ImportGuide } from "@/components/ImportGuide";
import { QuestionImageUpload } from "@/components/QuestionImageUpload";
import {
  M3FormSection, M5FormSection, M8FormSection, M10FormSection,
  gabaritoPorM5Booleans,
  type AssertivaDraft, type MatchingColDraft, type MatchingPairDraft, type QuestionGroupDraft,
} from "@/components/QuestionModelForms";
import {
  QUESTION_TYPE_LABELS, MultipleChoiceOptions, AssertionReasonSection,
  ComplexMCSection, MatchingSection, TrueFalseSection, OrderingSection,
  ClozeSection, MediaSection,
  type QuestionType, type FormatData,
} from "@/components/QuestionFormats";
import { MODEL_OPTIONS, getDbTypeForModel } from "@shared/questionModels";
import QuestionRenderer from "@/components/QuestionRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  BookOpen, CheckCircle, XCircle, FileText, Upload, ClipboardList,
  Loader2, Sparkles, Plus, Eye, SlidersHorizontal, ChevronDown,
  ChevronRight, Image, AlertCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  very_easy: "Muito Fácil", easy: "Fácil", medium: "Médio",
  hard: "Difícil", very_hard: "Muito Difícil",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  very_easy: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  very_hard: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};
const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_PT: Record<string, string> = {
  approved: "Aprovada", pending: "Pendente", rejected: "Rejeitada",
};

const defaultOptions = [
  { id: "A", textPt: "", textEn: "" }, { id: "B", textPt: "", textEn: "" },
  { id: "C", textPt: "", textEn: "" }, { id: "D", textPt: "", textEn: "" },
  { id: "E", textPt: "", textEn: "" },
];

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({ a, onDecision, isPending }: {
  a: any;
  onDecision: (id: number, status: "approved" | "rejected", notes: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const q = a.question;

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      a.status === "pending" ? "border-amber-500/25 bg-card" : "border-border/40 bg-card/50"
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">
              {q?.textPt ?? `Questão #${a.questionId}`}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {q?.modelId && (
                <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">
                  {q.modelId}
                </Badge>
              )}
              {q?.difficulty && (
                <Badge className={`text-[10px] h-4 px-1.5 border ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                  {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                </Badge>
              )}
              {q?.banca && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.banca}</Badge>
              )}
              {q?.year && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.year}</Badge>
              )}
              <Badge className={`text-[10px] h-4 px-1.5 border ${STATUS_COLORS[a.status] ?? ""}`}>
                {STATUS_PT[a.status] ?? a.status}
              </Badge>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            {q && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewOpen(true)} title="Pré-visualizar questão">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {a.status === "pending" && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded validation panel */}
      {a.status === "pending" && expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/30 space-y-3">
          {/* Quick view */}
          {q && (
            <div className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-2 text-sm">
              <p className="font-medium">{q.textPt}</p>
              {q.assertion1 && (
                <div className="space-y-1 text-xs">
                  <p><strong>Asserção I:</strong> {q.assertion1}</p>
                  <p className="text-center text-amber-400 font-bold text-[10px]">PORQUE</p>
                  <p><strong>Asserção II:</strong> {q.assertion2}</p>
                </div>
              )}
              {Array.isArray(q.options) && (
                <ul className="space-y-1 mt-1">
                  {q.options.map((opt: any) => (
                    <li key={opt.id} className={`text-xs px-2 py-1 rounded flex gap-1.5 ${
                      opt.id === q.correctOption
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-muted-foreground"
                    }`}>
                      <span className="font-bold shrink-0">{opt.id})</span>
                      <span>{opt.textPt}</span>
                    </li>
                  ))}
                </ul>
              )}
              {q.explanationPt && (
                <div className="text-xs pt-2 border-t border-border/20">
                  <strong className="text-muted-foreground">Justificativa:</strong> {q.explanationPt}
                </div>
              )}
            </div>
          )}

          <Textarea
            placeholder="Observações para o professor (opcional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="text-sm resize-none bg-background"
          />

          <div className="flex gap-2">
            <Button
              size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={() => onDecision(a.id, "approved", notes)}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
            </Button>
            <Button
              size="sm" variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1"
              onClick={() => onDecision(a.id, "rejected", notes)}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5" /> Rejeitar
            </Button>
          </div>
        </div>
      )}

      {/* Previous decision note */}
      {a.status !== "pending" && a.notes && (
        <div className="px-4 pb-3 text-xs text-muted-foreground italic border-t border-border/20 pt-2">
          Nota: {a.notes}
        </div>
      )}

      {/* Full preview dialog */}
      {q && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pré-visualização da Questão</DialogTitle>
            </DialogHeader>
            <QuestionRenderer
              question={{
                id: q.id, textPt: q.textPt, textEn: q.textEn,
                questionType: q.questionType, modelId: q.modelId,
                options: Array.isArray(q.options) ? q.options : [],
                correctOption: q.correctOption,
                explanationPt: q.explanationPt,
                assertion1: q.assertion1, assertion2: q.assertion2,
                a1Verdadeira: q.a1Verdadeira, a2Verdadeira: q.a2Verdadeira,
                relacaoCausal: q.relacaoCausal,
                formatData: q.formatData, imageUrl: q.imageUrl,
                difficulty: q.difficulty, banca: q.banca, year: q.year,
              }}
              answered revealAnswer language="pt" showExplanation
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── My Assignments Tab ───────────────────────────────────────────────────────

function MyAssignments() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);

  const { data, refetch, isLoading } = trpc.validation.listMyAssignments.useQuery({
    status: statusFilter, page: 1, pageSize: 30,
  });
  const { data: permissions = [] } = trpc.teacher.myPermissions.useQuery();

  const updateMutation = trpc.validation.updateAssignment.useMutation({
    onSuccess: () => { toast.success("Questão avaliada com sucesso"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const handleDecision = (id: number, status: "approved" | "rejected", notes: string) => {
    updateMutation.mutate({ assignmentId: id, status, notes: notes || undefined });
  };

  const rows = data?.rows ?? [];
  const filtered = disciplineFilter === "__all__"
    ? rows
    : rows.filter((a: any) => String(a.question?.disciplineId) === disciplineFilter);

  const pendingCount = rows.filter((a: any) => a.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5">
          {(["pending", "approved", "rejected", "all"] as const).map(s => (
            <Button
              key={s} size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
              {s === "pending" && pendingCount > 0 && (
                <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-amber-500/30 text-amber-300">{pendingCount}</Badge>
              )}
            </Button>
          ))}
        </div>

        {permissions.length > 0 && (
          <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as disciplinas</SelectItem>
              {permissions.map((p: any) => (
                <SelectItem key={p.disciplineId} value={String(p.disciplineId)}>
                  {p.disciplineName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma atribuição encontrada.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((a: any) => (
          <AssignmentCard key={a.id} a={a} onDecision={handleDecision} isPending={updateMutation.isPending} />
        ))}
      </div>

      {data && data.total > 30 && (
        <p className="text-xs text-center text-muted-foreground">
          Mostrando {Math.min(30, filtered.length)} de {data.total} atribuições.
        </p>
      )}
    </div>
  );
}

// ─── Create Question Tab ──────────────────────────────────────────────────────

function CreateQuestion() {
  const { data: permissions = [] } = trpc.teacher.myPermissions.useQuery();
  const createMutation = trpc.teacher.createQuestion.useMutation({
    onSuccess: ({ status }) => {
      toast.success(status === "approved" ? "Questão criada e aprovada!" : "Questão enviada para validação.");
      resetForm();
    },
    onError: e => toast.error(e.message),
  });

  // Form state
  const [form, setForm] = useState({
    disciplineId: "" as string,
    subjectId: "" as string,
    difficulty: "medium" as string,
    year: "" as string,
    questionType: "multiple_choice" as QuestionType,
    modelId: "" as string,
    banca: "", instituicao: "", cargo: "", carreira: "",
    areaFormacao: "", escolaridade: "" as string,
    subjectTag: "", author: "",
    textPt: "", textEn: "",
    correctOption: "A",
    explanationPt: "", explanationEn: "",
    assertion1: "", assertion2: "",
    a1Verdadeira: true as boolean,
    a2Verdadeira: true as boolean,
    relacaoCausal: true as boolean,
    imageUrl: "" as string,
    hasImage: false as boolean,
    isPremium: false as boolean,
    options: defaultOptions as Array<{ id: string; textPt: string; textEn?: string }>,
    formatData: {} as FormatData,
  });
  const [assertivas, setAssertivas] = useState<AssertivaDraft[]>([]);
  const [matchingEsq, setMatchingEsq] = useState<MatchingColDraft[]>([]);
  const [matchingDir, setMatchingDir] = useState<MatchingColDraft[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<MatchingPairDraft[]>([]);
  const [groupDraft, setGroupDraft] = useState<QuestionGroupDraft>({
    grupoId: "", textBasePt: "", alternativas: { A: "", B: "", C: "", D: "", E: "" },
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({
      disciplineId: "", subjectId: "", difficulty: "medium", year: "",
      questionType: "multiple_choice", modelId: "", banca: "", instituicao: "",
      cargo: "", carreira: "", areaFormacao: "", escolaridade: "",
      subjectTag: "", author: "", textPt: "", textEn: "",
      correctOption: "A", explanationPt: "", explanationEn: "",
      assertion1: "", assertion2: "", a1Verdadeira: true, a2Verdadeira: true,
      relacaoCausal: true, imageUrl: "", hasImage: false, isPremium: false,
      options: defaultOptions, formatData: {} as FormatData,
    });
    setAssertivas([]);
    setMatchingEsq([]); setMatchingDir([]); setMatchingPairs([]);
  };

  const canCreate = permissions.filter((p: any) => p.canCreateQuestions);

  const { data: subjects = [] } = trpc.questions.subjects.useQuery(
    { disciplineId: Number(form.disciplineId) },
    { enabled: !!form.disciplineId }
  );

  const handleSubmit = () => {
    if (!form.textPt || !form.disciplineId) {
      toast.error("Preencha o enunciado e selecione a disciplina.");
      return;
    }

    // Compute gabarito M5 from booleans
    let correctOption = form.correctOption;
    if (form.questionType === "assertion_reason") {
      correctOption = gabaritoPorM5Booleans(form.a1Verdadeira, form.a2Verdadeira, form.relacaoCausal);
    }

    createMutation.mutate({
      disciplineId: Number(form.disciplineId),
      subjectId: form.subjectId ? Number(form.subjectId) : undefined,
      difficulty: form.difficulty as any,
      year: form.year ? Number(form.year) : undefined,
      questionType: form.questionType,
      modelId: form.modelId || undefined,
      banca: form.banca || undefined,
      instituicao: form.instituicao || undefined,
      cargo: form.cargo || undefined,
      carreira: form.carreira || undefined,
      areaFormacao: form.areaFormacao || undefined,
      escolaridade: (form.escolaridade || undefined) as any,
      subjectTag: form.subjectTag || undefined,
      author: form.author || undefined,
      textPt: form.textPt,
      textEn: form.textEn || undefined,
      imageUrl: form.hasImage ? (form.imageUrl || undefined) : undefined,
      options: form.questionType === "discursive"
        ? [{ id: "A", textPt: "Discursiva" }]
        : form.options,
      correctOption: form.questionType === "discursive" ? "A" : correctOption,
      explanationPt: form.explanationPt || undefined,
      explanationEn: form.explanationEn || undefined,
      assertion1: form.questionType === "assertion_reason" ? form.assertion1 || undefined : undefined,
      assertion2: form.questionType === "assertion_reason" ? form.assertion2 || undefined : undefined,
      a1Verdadeira: form.questionType === "assertion_reason" ? form.a1Verdadeira : undefined,
      a2Verdadeira: form.questionType === "assertion_reason" ? form.a2Verdadeira : undefined,
      relacaoCausal: form.questionType === "assertion_reason" ? form.relacaoCausal : undefined,
      formatData: form.formatData,
      isPremium: form.isPremium,
    });
  };

  if (canCreate.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Você não tem permissão para criar questões em nenhuma disciplina.</p>
        <p className="text-xs mt-1">Solicite ao coordenador que conceda a permissão "Criar questões".</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Model selector */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Modelo de Item (M1–M10)</Label>
        <Select
          value={form.modelId || "__none__"}
          onValueChange={v => {
            const mid = v === "__none__" ? "" : v;
            const dbType = mid ? getDbTypeForModel(mid) : form.questionType;
            set("modelId", mid);
            set("questionType", (dbType || form.questionType) as QuestionType);
          }}
        >
          <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sem modelo definido —</SelectItem>
            {MODEL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Enunciado */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Enunciado *</Label>
        <Textarea
          value={form.textPt}
          onChange={e => set("textPt", e.target.value)}
          placeholder="Escreva o enunciado completo da questão..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* M5 — Asserção-Razão */}
      {form.questionType === "assertion_reason" && (
        <M5FormSection
          assertion1={form.assertion1} assertion2={form.assertion2}
          a1Verdadeira={form.a1Verdadeira} a2Verdadeira={form.a2Verdadeira}
          relacaoCausal={form.relacaoCausal}
          onChange={patch => setForm(p => ({ ...p, ...patch }))}
        />
      )}

      {/* M3 — Assertivas */}
      {form.questionType === "complex_multiple_choice" && (
        <M3FormSection
          assertivas={assertivas}
          onChange={setAssertivas}
          onAlternativasGeradas={(alts, gab) => {
            const opts = ["A","B","C","D","E"].map(l => ({ id: l, textPt: alts[l] ?? "" }));
            set("options", opts as any);
            set("correctOption", gab);
          }}
        />
      )}

      {/* M8 — Associação */}
      {form.questionType === "matching" && (
        <M8FormSection
          esquerda={matchingEsq} direita={matchingDir} pairs={matchingPairs}
          onChange={(esq, dir, pairs) => { setMatchingEsq(esq); setMatchingDir(dir); setMatchingPairs(pairs); }}
          onAlternativasGeradas={(alts, gab) => {
            const opts = ["A","B","C","D","E"].map(l => ({ id: l, textPt: alts[l] ?? "" }));
            set("options", opts as any);
            set("correctOption", gab);
          }}
        />
      )}

      {/* M10 — Bloco */}
      {form.modelId === "M10" && (
        <M10FormSection group={groupDraft} onChange={setGroupDraft} />
      )}

      {/* Alternativas (padrão MC) */}
      {["multiple_choice", "cloze", "true_false", "ordering", "clinical_case", "image_analysis", "interpretation"].includes(form.questionType) && (
        <MultipleChoiceOptions
          options={form.options}
          correctOption={form.correctOption}
          lang="pt"
          onOptionsChange={opts => set("options", opts)}
          onCorrectChange={v => set("correctOption", v)}
        />
      )}

      {/* Classificação */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Disciplina *</Label>
          <Select value={form.disciplineId || "__none__"} onValueChange={v => set("disciplineId", v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {canCreate.map((p: any) => (
                <SelectItem key={p.disciplineId} value={String(p.disciplineId)}>{p.disciplineName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Dificuldade *</Label>
          <Select value={form.difficulty} onValueChange={v => set("difficulty", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Banca</Label>
          <Input value={form.banca} onChange={e => set("banca", e.target.value)} placeholder="Ex: CESPE" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Instituição</Label>
          <Input value={form.instituicao} onChange={e => set("instituicao", e.target.value)} placeholder="Ex: USP" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Input value={form.year} onChange={e => set("year", e.target.value)} placeholder="Ex: 2023" type="number" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Carreira</Label>
          <Input value={form.carreira} onChange={e => set("carreira", e.target.value)} placeholder="Ex: Residência" className="h-9 text-sm" />
        </div>
      </div>

      {/* Explicação */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Justificativa / Explicação do gabarito</Label>
        <Textarea
          value={form.explanationPt}
          onChange={e => set("explanationPt", e.target.value)}
          placeholder="Explique por que o gabarito está correto e por que os distratores estão errados..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Image toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox" checked={form.hasImage}
            onChange={e => set("hasImage", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <Image className="h-4 w-4 text-muted-foreground" />
          Esta questão possui imagem
        </label>
        {form.hasImage && (
          <QuestionImageUpload
            value={form.imageUrl || null}
            onChange={url => set("imageUrl", url ?? "")}
            questionType="mc"
          />
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
        className="w-full bg-primary text-primary-foreground gap-2"
      >
        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Criar Questão
      </Button>
    </div>
  );
}

// ─── My Questions Tab ─────────────────────────────────────────────────────────

function MyQuestions() {
  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const { data: myQ, isLoading } = trpc.teacher.myQuestions.useQuery({
    status: (applied.status as any) || "all",
    limit: 20, offset: (page - 1) * 20,
  });

  const { data: previewQ } = trpc.questions.byId.useQuery(
    { id: previewId! }, { enabled: !!previewId }
  );

  const questions = myQ ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <QuestionFilters
          filters={filters}
          onChange={setFilters}
          onApply={() => { setApplied(filters); setPage(1); }}
          showAdminFields={true}
        />
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {!isLoading && questions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma questão encontrada.</p>
        </div>
      )}

      <div className="space-y-2">
        {questions.map((q: any) => (
          <div key={q.id} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{q.textPt}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {q.modelId && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">{q.modelId}</Badge>
                )}
                <Badge className={`text-[10px] h-4 px-1.5 border ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                  {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                </Badge>
                <Badge className={`text-[10px] h-4 px-1.5 border ${STATUS_COLORS[q.status] ?? ""}`}>
                  {STATUS_PT[q.status] ?? q.status}
                </Badge>
                {q.isValidated && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                    ✓ Validada
                  </Badge>
                )}
                {q.banca && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.banca}</Badge>}
                {q.year && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.year}</Badge>}
              </div>
              {q.disciplineName && (
                <p className="text-xs text-muted-foreground mt-1">{q.disciplineName}{q.subjectName ? ` › ${q.subjectName}` : ""}</p>
              )}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setPreviewId(q.id)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewId} onOpenChange={open => !open && setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          {previewQ && (
            <QuestionRenderer
              question={{
                id: previewQ.id, textPt: previewQ.textPt, textEn: previewQ.textEn ?? undefined,
                questionType: previewQ.questionType ?? undefined, modelId: (previewQ as any).modelId ?? undefined,
                options: Array.isArray(previewQ.options) ? previewQ.options as any : [],
                correctOption: previewQ.correctOption,
                explanationPt: previewQ.explanationPt ?? undefined,
                assertion1: previewQ.assertion1 ?? undefined, assertion2: previewQ.assertion2 ?? undefined,
                a1Verdadeira: (previewQ as any).a1Verdadeira, a2Verdadeira: (previewQ as any).a2Verdadeira,
                relacaoCausal: (previewQ as any).relacaoCausal,
                formatData: previewQ.formatData, imageUrl: previewQ.imageUrl ?? undefined,
                difficulty: previewQ.difficulty, banca: (previewQ as any).banca, year: previewQ.year ?? undefined,
              }}
              answered revealAnswer language="pt" showExplanation
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function TeacherImportTab() {
  const [preloadedRows, setPreloadedRows] = useState<ParsedMCQuestion[]>([]);
  const [section, setSection] = useState<"file" | "ai">("file");

  const handleAIExtracted = (questions: AIExtractedQuestion[]) => {
    const mapped = questions.map(q => ({
      textPt: q.textPt, disciplineId: q.disciplineId ?? 0, subjectTag: q.disciplineSuggestion,
      author: q.author ?? "", year: q.year, difficulty: q.difficulty,
      questionType: q.questionType as ParsedMCQuestion["questionType"],
      optA: q.optA, optB: q.optB, optC: q.optC, optD: q.optD, optE: q.optE,
      correctOption: q.correctOption, explanationPt: q.explanationPt,
      assertion1: q.assertion1, assertion2: q.assertion2,
      _rowIndex: q._rowIndex, _errors: q._errors, _valid: q._valid,
    })) as ParsedMCQuestion[];
    setPreloadedRows(mapped);
    setSection("file");
    toast.success(`${mapped.length} questões carregadas na pré-visualização`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button size="sm" variant={section === "file" ? "default" : "outline"} className="gap-1" onClick={() => setSection("file")}>
          <Upload className="h-3.5 w-3.5" /> CSV / XLSX / JSON
        </Button>
        <Button size="sm" variant={section === "ai" ? "default" : "outline"} className="gap-1" onClick={() => setSection("ai")}>
          <Sparkles className="h-3.5 w-3.5" /> Extrair com IA (PDF / Word)
        </Button>
      </div>

      {section === "ai" && <AIQuestionExtractor onQuestionsExtracted={handleAIExtracted} />}
      {section === "file" && (
        <QuestionImport
          onImportComplete={count => toast.success(`${count} questões importadas`)}
          preloadedRows={preloadedRows.length > 0 ? preloadedRows : undefined}
        />
      )}

      <ImportGuide defaultTab="json" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherPanel() {
  const { user } = useAuth();

  if (!user || !["teacher", "coordinator", "superuser", "admin"].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <BookOpen className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm">Apenas professores podem acessar esta área.</p>
          <Link href="/"><Button className="mt-4">Voltar ao início</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Painel do Professor</h1>
            <p className="text-muted-foreground text-sm">
              Crie questões, valide atribuições e importe em lote.
            </p>
          </div>
        </div>

        <Tabs defaultValue="assignments">
          <TabsList className="mb-6 h-auto flex-wrap gap-1">
            <TabsTrigger value="assignments" className="gap-1.5 text-sm">
              <ClipboardList className="h-3.5 w-3.5" /> Atribuições
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5 text-sm">
              <Plus className="h-3.5 w-3.5" /> Nova Questão
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5" /> Minhas Questões
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5 text-sm">
              <Upload className="h-3.5 w-3.5" /> Importar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Atribuições de Validação</h2>
              <p className="text-sm text-muted-foreground">
                Questões atribuídas pelo coordenador para sua revisão.
              </p>
            </div>
            <MyAssignments />
          </TabsContent>

          <TabsContent value="create">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Nova Questão</h2>
              <p className="text-sm text-muted-foreground">
                Crie questões individuais. Professores criam como pendentes; coordenadores criam como aprovadas.
              </p>
            </div>
            <CreateQuestion />
          </TabsContent>

          <TabsContent value="my">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Minhas Questões</h2>
              <p className="text-sm text-muted-foreground">Questões que você criou e seu status de validação.</p>
            </div>
            <MyQuestions />
          </TabsContent>

          <TabsContent value="import">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Importar Questões</h2>
              <p className="text-sm text-muted-foreground">
                Importe em lote via CSV, XLSX ou JSON — ou extraia de PDFs com IA.
              </p>
            </div>
            <TeacherImportTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
