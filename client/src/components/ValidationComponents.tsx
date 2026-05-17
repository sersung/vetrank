/**
 * ValidationComponents.tsx
 * Componentes compartilhados do fluxo de validação:
 *   RejectionDialog   — modal de recusa com motivo obrigatório + justificativa mínima
 *   RevisionCard      — card de questão rejeitada com botão para revisar
 *   RevisionForm      — formulário de revisão e reenvio
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import QuestionRenderer from "@/components/QuestionRenderer";
import { MultipleChoiceOptions } from "@/components/QuestionFormats";
import { toast } from "sonner";
import {
  XCircle, AlertCircle, RefreshCw, Eye, CheckCircle, FileEdit,
  ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Rejection reason labels ──────────────────────────────────────────────────

export const REJECTION_REASON_LABELS: Record<string, string> = {
  erro_conteudo:      "Erro técnico no conteúdo",
  gabarito_incorreto: "Gabarito incorreto",
  alternativas:       "Alternativas mal elaboradas",
  enunciado_ambiguo:  "Enunciado ambíguo ou confuso",
  nivel_inadequado:   "Nível de dificuldade inadequado",
  fora_escopo:        "Fora do escopo da disciplina",
  duplicata:          "Questão duplicada no banco",
  linguagem:          "Linguagem ou formato inadequado",
  outros:             "Outros motivos",
};

export const REJECTION_REASONS = Object.entries(REJECTION_REASON_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ─── RejectionDialog ─────────────────────────────────────────────────────────

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes: string) => void;
  isPending: boolean;
  questionPreview?: string;
}

export function RejectionDialog({
  open, onOpenChange, onConfirm, isPending, questionPreview,
}: RejectionDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const isValid = reason && notes.trim().length >= 20;
  const charsLeft = Math.max(0, 20 - notes.trim().length);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(reason, notes);
    setReason("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={open => { onOpenChange(open); if (!open) { setReason(""); setNotes(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" /> Recusar Questão
          </DialogTitle>
        </DialogHeader>

        {questionPreview && (
          <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-sm text-muted-foreground line-clamp-3">
            {questionPreview}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Motivo da recusa <span className="text-red-400">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className={`h-9 ${!reason ? "border-red-500/40" : ""}`}>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Justificativa <span className="text-red-400">*</span>
              <span className="text-xs text-muted-foreground font-normal ml-2">
                mínimo 20 caracteres
              </span>
            </Label>
            <Textarea
              placeholder="Descreva detalhadamente o problema encontrado. Indique onde está o erro e o que precisa ser corrigido para que o elaborador possa revisar a questão..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              className={`resize-none text-sm ${notes.trim().length > 0 && notes.trim().length < 20 ? "border-amber-500/50" : ""}`}
            />
            <div className="flex items-center justify-between">
              {charsLeft > 0 && notes.length > 0 ? (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Ainda faltam {charsLeft} caracteres para o mínimo.
                </p>
              ) : notes.trim().length >= 20 ? (
                <p className="text-xs text-emerald-400">✓ Justificativa adequada</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">{notes.length} caracteres</span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              A questão será <strong>ocultada dos usuários</strong> até que o elaborador revise e reenvie.
              O motivo e a justificativa serão visíveis para o elaborador.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isPending}
            className="bg-red-600 hover:bg-red-700 text-white gap-1"
          >
            <XCircle className="h-4 w-4" />
            {isPending ? "Recusando..." : "Confirmar Recusa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── RevisionCard ─────────────────────────────────────────────────────────────

interface RevisionCardProps {
  question: any;
  onRevise: (q: any) => void;
}

export function RevisionCard({ question, onRevise }: RevisionCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { data: fullQ } = trpc.questions.byId.useQuery(
    { id: question.id }, { enabled: previewOpen }
  );

  const rejection = question.rejection;
  const DIFF_COLORS: Record<string, string> = {
    very_easy: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    easy: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    hard: "bg-red-500/20 text-red-400 border-red-500/30",
    very_hard: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  const DIFF_PT: Record<string, string> = {
    very_easy: "Muito Fácil", easy: "Fácil", medium: "Médio",
    hard: "Difícil", very_hard: "Muito Difícil",
  };

  return (
    <div className="rounded-xl border border-red-500/25 bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge className="text-[10px] h-4 px-1.5 bg-red-500/20 text-red-400 border-red-500/30">
                <XCircle className="h-2.5 w-2.5 mr-1" /> Rejeitada
              </Badge>
              {question.revisionCount > 0 && (
                <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <RefreshCw className="h-2.5 w-2.5 mr-1" /> {question.revisionCount}ª revisão
                </Badge>
              )}
              {question.modelId && (
                <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">
                  {question.modelId}
                </Badge>
              )}
              <Badge className={`text-[10px] h-4 px-1.5 border ${DIFF_COLORS[question.difficulty] ?? ""}`}>
                {DIFF_PT[question.difficulty] ?? question.difficulty}
              </Badge>
            </div>
            <p className="text-sm line-clamp-2">{question.textPt}</p>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Rejection details + revision CTA */}
      {expanded && rejection && (
        <div className="px-4 pb-4 border-t border-red-500/15 pt-3 space-y-3">
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Motivo da recusa</p>
            <div className="flex items-center gap-2">
              <Badge className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
                {REJECTION_REASON_LABELS[rejection.rejectionReason] ?? rejection.rejectionReason ?? "Não especificado"}
              </Badge>
            </div>
            {rejection.notes && (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{rejection.notes}</p>
            )}
          </div>

          <Button
            className="w-full gap-2 bg-primary text-primary-foreground"
            onClick={() => onRevise(question)}
          >
            <FileEdit className="h-4 w-4" />
            Revisar e Reenviar para Validação
          </Button>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Questão Rejeitada — Pré-visualização</DialogTitle></DialogHeader>
          {fullQ && (
            <QuestionRenderer
              question={{
                id: fullQ.id, textPt: fullQ.textPt, textEn: fullQ.textEn ?? undefined,
                questionType: fullQ.questionType ?? undefined,
                modelId: (fullQ as any).modelId ?? undefined,
                options: Array.isArray(fullQ.options) ? fullQ.options as any : [],
                correctOption: fullQ.correctOption,
                explanationPt: fullQ.explanationPt ?? undefined,
                assertion1: fullQ.assertion1 ?? undefined,
                assertion2: fullQ.assertion2 ?? undefined,
                formatData: fullQ.formatData,
                imageUrl: fullQ.imageUrl ?? undefined,
                difficulty: fullQ.difficulty,
              }}
              answered revealAnswer language="pt" showExplanation
            />
          )}
          {rejection && (
            <div className="mt-4 rounded-lg bg-red-500/8 border border-red-500/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-red-400 uppercase">Feedback do Validador</p>
              <Badge className="text-xs">{REJECTION_REASON_LABELS[rejection.rejectionReason] ?? "Motivo não especificado"}</Badge>
              {rejection.notes && <p className="text-sm text-foreground/80">{rejection.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── RevisionForm ─────────────────────────────────────────────────────────────

interface RevisionFormProps {
  question: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function RevisionForm({ question, onClose, onSuccess }: RevisionFormProps) {
  const { data: fullQ, isLoading } = trpc.questions.byId.useQuery({ id: question.id });

  const [textPt, setTextPt] = useState("");
  const [explanationPt, setExplanationPt] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [correctOption, setCorrectOption] = useState("A");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (fullQ && !initialized) {
    setTextPt(fullQ.textPt);
    setExplanationPt(fullQ.explanationPt ?? "");
    setOptions(Array.isArray(fullQ.options) ? fullQ.options as any : []);
    setCorrectOption(fullQ.correctOption);
    setInitialized(true);
  }

  const submitMutation = trpc.validation.submitRevision.useMutation({
    onSuccess: () => {
      toast.success("Questão revisada e reenviada para validação!");
      onSuccess();
      onClose();
    },
    onError: e => toast.error(e.message),
  });

  const rejection = question.rejection;

  const handleSubmit = () => {
    if (!revisionNotes.trim() || revisionNotes.trim().length < 10) {
      toast.error("Descreva o que foi alterado (mínimo 10 caracteres).");
      return;
    }
    submitMutation.mutate({
      questionId: question.id,
      textPt,
      options,
      correctOption,
      explanationPt: explanationPt || undefined,
      revisionNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Rejection feedback panel */}
      {rejection && (
        <div className="rounded-xl bg-red-500/8 border border-red-500/25 p-4 space-y-2">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Feedback do Validador
          </p>
          <Badge className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
            {REJECTION_REASON_LABELS[rejection.rejectionReason] ?? "Motivo não especificado"}
          </Badge>
          {rejection.notes && (
            <p className="text-sm text-foreground/80 bg-red-500/5 rounded-lg p-2">{rejection.notes}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Corrija apenas o que foi apontado. A questão voltará ao status "Pendente" e aguardará nova atribuição.
      </div>

      {/* Enunciado */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Enunciado</Label>
        <Textarea
          value={textPt}
          onChange={e => setTextPt(e.target.value)}
          rows={4}
          className="resize-none text-sm"
        />
      </div>

      {/* Alternativas */}
      {options.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Alternativas</Label>
          <MultipleChoiceOptions
            options={options}
            correctOption={correctOption}
            lang="pt"
            onOptionsChange={setOptions}
            onCorrectChange={setCorrectOption}
          />
        </div>
      )}

      {/* Explicação */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Justificativa / Explicação do gabarito</Label>
        <Textarea
          value={explanationPt}
          onChange={e => setExplanationPt(e.target.value)}
          rows={3}
          className="resize-none text-sm"
          placeholder="Justificativa detalhada..."
        />
      </div>

      {/* O que mudou */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          O que foi alterado nesta revisão <span className="text-red-400">*</span>
        </Label>
        <Textarea
          value={revisionNotes}
          onChange={e => setRevisionNotes(e.target.value)}
          rows={3}
          placeholder="Descreva as correções realizadas para que o validador possa verificar rapidamente (mínimo 10 caracteres)..."
          className={`resize-none text-sm ${revisionNotes.length > 0 && revisionNotes.trim().length < 10 ? "border-amber-500/50" : ""}`}
        />
        <p className="text-xs text-muted-foreground">{revisionNotes.length} caracteres</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="flex-1 bg-primary gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {submitMutation.isPending ? "Enviando..." : "Reenviar para Validação"}
        </Button>
      </div>
    </div>
  );
}
