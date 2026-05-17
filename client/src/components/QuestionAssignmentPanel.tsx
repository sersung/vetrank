/**
 * QuestionAssignmentPanel.tsx
 * Painel de atribuição eficiente de questões para validação por professores.
 * Usado no AdminPanel e no CoordinatorPanel.
 *
 * Funcionalidades:
 *  - Lista questões pendentes de validação (status = "pending")
 *  - Filtros: disciplina, modelo M1–M10, banca, ano
 *  - Seleção múltipla com checkbox
 *  - Atribuição em lote para um professor
 *  - Atribuição individual por questão (quick-assign)
 *  - Histórico de atribuições com motivo de recusa
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send, Users, CheckCircle, XCircle, Clock, RefreshCw,
  ChevronLeft, ChevronRight, SlidersHorizontal, AlertCircle,
} from "lucide-react";
import { REJECTION_REASON_LABELS } from "@/components/ValidationComponents";
import { MODEL_OPTIONS } from "@shared/questionModels";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_PT: Record<string, string> = {
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

const PAGE_SIZE = 20;

// ─── Pending Questions Tab ────────────────────────────────────────────────────

function PendingQuestionsTab() {
  const [disciplineId, setDisciplineId] = useState<string>("__all__");
  const [modelFilter, setModelFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [targetTeacherId, setTargetTeacherId] = useState<string>("");
  const [quickAssignId, setQuickAssignId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.validation.listPendingAssignment.useQuery({
    disciplineId: disciplineId !== "__all__" ? Number(disciplineId) : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const { data: disciplines = [] } = trpc.questions.disciplines.useQuery();
  const { data: teachers = [] } = trpc.validation.listProfessors.useQuery();

  const assignMutation = trpc.validation.createAssignment.useMutation({
    onSuccess: ({ count }) => {
      toast.success(`${count} questão(ões) atribuída(s) com sucesso.`);
      setSelected(new Set());
      setAssignDialogOpen(false);
      setQuickAssignId(null);
      setTargetTeacherId("");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const rows = data?.rows ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };

  const handleAssign = (ids: number[]) => {
    if (!targetTeacherId) { toast.error("Selecione um professor."); return; }
    assignMutation.mutate({
      assignedTo: Number(targetTeacherId),
      questionIds: ids,
      questionType: "multiple_choice",
    });
  };

  // Filter by model client-side (modelId comes from the server)
  const filtered = modelFilter === "__all__"
    ? rows
    : rows.filter(r => (r as any).modelId === modelFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Disciplina</Label>
          <Select value={disciplineId} onValueChange={v => { setDisciplineId(v); setPage(1); setSelected(new Set()); }}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {disciplines.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.namePt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Modelo M1–M10</Label>
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {MODEL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          {selected.size > 0 && (
            <Button
              size="sm" className="h-8 gap-1.5"
              onClick={() => setAssignDialogOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              Atribuir {selected.size} selecionada(s)
            </Button>
          )}
        </div>
      </div>

      {/* Header row */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
          <Checkbox
            checked={selected.size === filtered.length && filtered.length > 0}
            onCheckedChange={toggleAll}
            className="h-3.5 w-3.5"
          />
          <span>{data?.total ?? 0} questão(ões) pendentes</span>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30 text-emerald-400" />
          <p className="text-sm">Nenhuma questão pendente de atribuição.</p>
        </div>
      )}

      {/* Question list */}
      <div className="space-y-2">
        {filtered.map(q => (
          <div
            key={q.id}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              selected.has(q.id) ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"
            }`}
          >
            <Checkbox
              checked={selected.has(q.id)}
              onCheckedChange={() => toggleSelect(q.id)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{q.textPt}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(q as any).modelId && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">
                    {(q as any).modelId}
                  </Badge>
                )}
                <Badge className={`text-[10px] h-4 px-1.5 border ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                  {DIFFICULTY_PT[q.difficulty] ?? q.difficulty}
                </Badge>
                {(q as any).banca && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{(q as any).banca}</Badge>
                )}
                {q.year && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.year}</Badge>}
                {(q as any).revisionCount > 0 && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                    Revisão {(q as any).revisionCount}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"
              onClick={() => { setQuickAssignId(q.id); setAssignDialogOpen(true); }}
            >
              <Send className="h-3 w-3" /> Atribuir
            </Button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={open => { setAssignDialogOpen(open); if (!open) { setQuickAssignId(null); setTargetTeacherId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Atribuir para Validação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {quickAssignId
                ? "Atribuindo 1 questão ao professor selecionado."
                : `Atribuindo ${selected.size} questão(ões) ao professor selecionado.`
              }
            </p>
            <div className="space-y-1">
              <Label className="text-sm">Professor validador</Label>
              <Select value={targetTeacherId} onValueChange={setTargetTeacherId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um professor..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name || t.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!targetTeacherId || assignMutation.isPending}
              onClick={() => handleAssign(quickAssignId ? [quickAssignId] : Array.from(selected))}
              className="gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              {assignMutation.isPending ? "Atribuindo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Assignment History Tab ───────────────────────────────────────────────────

function AssignmentHistoryTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [professorFilter, setProfessorFilter] = useState<string>("__all__");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.validation.listAllAssignments.useQuery({
    professorId: professorFilter !== "__all__" ? Number(professorFilter) : undefined,
    status: statusFilter,
    page,
    pageSize: 30,
  });

  const { data: teachers = [] } = trpc.validation.listProfessors.useQuery();

  const rows = data?.rows ?? [];
  const totalPages = data ? Math.ceil(data.total / 30) : 1;

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending:  { label: "Pendente",  color: "bg-amber-500/20 text-amber-400 border-amber-500/30",   icon: Clock },
    approved: { label: "Aprovada",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
    rejected: { label: "Recusada",  color: "bg-red-500/20 text-red-400 border-red-500/30",          icon: XCircle },
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <Button
              key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
        <Select value={professorFilter} onValueChange={v => { setProfessorFilter(v); setPage(1); }}>
          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Professor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os professores</SelectItem>
            {teachers.map((t: any) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name || t.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="space-y-2">
        {rows.map((a: any) => {
          const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <div key={a.id} className="p-3 bg-card border border-border/40 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 flex-wrap mb-1">
                    <Badge className={`text-[10px] h-4 px-1.5 border ${cfg.color}`}>
                      <Icon className="h-2.5 w-2.5 mr-0.5" /> {cfg.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Questão #{a.questionId} · {a.questionType}
                    </span>
                  </div>
                  {a.status === "rejected" && (
                    <div className="mt-1 space-y-1">
                      {a.rejectionReason && (
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {REJECTION_REASON_LABELS[a.rejectionReason] ?? a.rejectionReason}
                        </p>
                      )}
                      {a.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">"{a.notes}"</p>
                      )}
                    </div>
                  )}
                  {a.status === "approved" && a.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-1 italic mt-1">"{a.notes}"</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma atribuição encontrada.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function QuestionAssignmentPanel() {
  const { data: stats } = trpc.validation.getValidationStats.useQuery();

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total MC", value: stats.multipleChoice.total, color: "text-blue-400" },
            { label: "Validadas", value: stats.multipleChoice.validated, color: "text-emerald-400" },
            { label: "Pendentes", value: stats.multipleChoice.pending, color: "text-amber-400" },
            { label: "Professores", value: stats.byProfessor.length, color: "text-violet-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-card p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* By professor breakdown */}
      {stats && stats.byProfessor.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Progresso por Professor
          </p>
          <div className="space-y-2">
            {stats.byProfessor.map(p => (
              <div key={p.professorId} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate text-xs">{p.professorName}</span>
                <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70 rounded-full"
                    style={{ width: `${p.total > 0 ? (p.approved / p.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex gap-2 text-[10px] shrink-0">
                  <span className="text-emerald-400">{p.approved}✓</span>
                  <span className="text-red-400">{p.rejected}✗</span>
                  <span className="text-amber-400">{p.pending}⏳</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="h-8 gap-1">
          <TabsTrigger value="pending" className="h-7 text-xs gap-1">
            <Clock className="h-3 w-3" /> Pendentes de Atribuição
          </TabsTrigger>
          <TabsTrigger value="history" className="h-7 text-xs gap-1">
            <CheckCircle className="h-3 w-3" /> Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PendingQuestionsTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <AssignmentHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
