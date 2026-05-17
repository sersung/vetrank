import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { QuestionFilters, type QuestionFilterState, EMPTY_FILTERS } from "@/components/QuestionFilters";
import QuestionRenderer from "@/components/QuestionRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { QuestionAssignmentPanel } from "@/components/QuestionAssignmentPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Users, Shield, Activity, BarChart2, BookOpen, CheckSquare,
  UserPlus, UserMinus, Clock, Loader2, Eye, SlidersHorizontal,
  ChevronLeft, ChevronRight, Search, CheckCircle, XCircle, Send, ClipboardList,
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

const PAGE_SIZE = 20;

// ─── PermRow ──────────────────────────────────────────────────────────────────

interface PermRowProps {
  discipline: { id: number; namePt: string };
  perm: { id: number; canCreateQuestions: boolean; canValidateQuestions: boolean; canCreateExams: boolean } | undefined;
  onGrant: (disciplineId: number, opts: { canCreate: boolean; canValidate: boolean; canExams: boolean }) => void;
  onRevoke: (permId: number) => void;
  isGranting: boolean;
  isRevoking: boolean;
}

function PermRow({ discipline, perm, onGrant, onRevoke, isGranting, isRevoking }: PermRowProps) {
  const [canCreate, setCanCreate] = useState(perm?.canCreateQuestions ?? true);
  const [canValidate, setCanValidate] = useState(perm?.canValidateQuestions ?? false);
  const [canExams, setCanExams] = useState(perm?.canCreateExams ?? true);
  const granted = !!perm;

  const opts = { canCreate, canValidate, canExams };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      granted ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"
    }`}>
      <Checkbox
        checked={granted}
        disabled={isGranting || isRevoking}
        onCheckedChange={checked => {
          if (checked) onGrant(discipline.id, opts);
          else if (perm) onRevoke(perm.id);
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{discipline.namePt}</p>
        <div className="flex gap-3 mt-1.5 flex-wrap">
          {[
            { label: "Criar questões", checked: perm?.canCreateQuestions ?? canCreate, set: setCanCreate, key: "canCreate" as const },
            { label: "Validar questões", checked: perm?.canValidateQuestions ?? canValidate, set: setCanValidate, key: "canValidate" as const },
            { label: "Criar simulados", checked: perm?.canCreateExams ?? canExams, set: setCanExams, key: "canExams" as const },
          ].map(item => (
            <label key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={item.checked}
                disabled={!granted && !item.checked ? false : !granted}
                className="h-3 w-3"
                onCheckedChange={v => {
                  item.set(!!v);
                  if (perm) {
                    onGrant(discipline.id, {
                      canCreate: item.key === "canCreate" ? !!v : (perm.canCreateQuestions),
                      canValidate: item.key === "canValidate" ? !!v : (perm.canValidateQuestions),
                      canExams: item.key === "canExams" ? !!v : (perm.canCreateExams),
                    });
                  }
                }}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {granted && (
          <Badge className="text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-600/30">Autorizado</Badge>
        )}
        {(isGranting || isRevoking) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}

// ─── Question Bank Tab ────────────────────────────────────────────────────────

function QuestionBankTab() {
  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [assignDialogId, setAssignDialogId] = useState<number | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState<string>("");

  const { data, isLoading } = trpc.questions.list.useQuery({
    ...applied,
    difficulty: applied.difficulty as any,
    escolaridade: applied.escolaridade as any,
    questionType: applied.questionType as any,
    status: applied.status as any,
    orderBy: applied.orderBy as any,
    myAnswers: applied.myAnswers as any,
    page, limit: PAGE_SIZE,
  });

  const { data: previewQ } = trpc.questions.byId.useQuery(
    { id: previewId! }, { enabled: !!previewId }
  );

  const { data: teachers = [] } = trpc.coordinator.listTeachers.useQuery();

  // Assignment mutation — procedure added when validation router exposes assignQuestion
  const assignMutation: any = null;

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filtros</span>
          {data && (
            <span className="ml-auto text-xs text-muted-foreground">
              {data.total} questão(ões)
            </span>
          )}
        </div>
        <QuestionFilters
          filters={filters}
          onChange={setFilters}
          onApply={() => { setApplied(filters); setPage(1); }}
          showAdminFields={true}
        />
      </div>

      {/* Questions list */}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}

      {!isLoading && !data?.questions.length && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma questão encontrada.</p>
        </div>
      )}

      <div className="space-y-2">
        {data?.questions.map((q, idx) => {
          const options = q.options as any[];
          return (
            <div key={q.id} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl">
              <span className="text-xs text-muted-foreground mt-0.5 w-6 shrink-0">
                {(page - 1) * PAGE_SIZE + idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{q.textPt}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(q as any).modelId && (
                    <Badge className="text-[10px] h-4 px-1.5 bg-violet-500/20 text-violet-300 border-violet-500/30">
                      {(q as any).modelId}
                    </Badge>
                  )}
                  <Badge className={`text-[10px] h-4 px-1.5 border ${DIFFICULTY_COLORS[q.difficulty] ?? ""}`}>
                    {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                  </Badge>
                  {(q as any).banca && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{(q as any).banca}</Badge>}
                  {q.year && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{q.year}</Badge>}
                  {q.isValidated
                    ? <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Validada</Badge>
                    : <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>
                  }
                  {(q as any).isAnulada && <Badge className="text-[10px] h-4 px-1.5 bg-orange-500/20 text-orange-400 border-orange-500/30">Anulada</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewId(q.id)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {teachers.length > 0 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAssignDialogId(q.id)} title="Atribuir para validação">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewId} onOpenChange={open => !open && setPreviewId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pré-visualização da Questão</DialogTitle></DialogHeader>
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

      {/* Assign dialog */}
      <Dialog open={!!assignDialogId} onOpenChange={open => !open && setAssignDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atribuir para validação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">Selecione o professor:</Label>
            <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
              <SelectTrigger><SelectValue placeholder="Escolha um professor..." /></SelectTrigger>
              <SelectContent>
                {teachers.map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name || t.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDialogId(null)}>Cancelar</Button>
            <Button
              disabled={!assignTeacherId || assignMutation?.isPending}
              onClick={() => assignMutation?.mutate?.({ questionId: assignDialogId!, teacherId: Number(assignTeacherId) })}
            >
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Teachers Tab ─────────────────────────────────────────────────────────────

function TeachersTab({ teachers, onPermissions, onDemote, isDemoting }: {
  teachers: any[];
  onPermissions: (id: number) => void;
  onDemote: (id: number) => void;
  isDemoting: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = teachers.filter(t =>
    !search || (t.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar professor por nome ou email..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "Nenhum professor encontrado." : "Nenhum professor cadastrado ainda."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(t.name ?? t.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                <p className="text-xs text-muted-foreground">
                  Último acesso: {t.lastSignedIn ? new Date(t.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => onPermissions(t.id)}>
                  <CheckSquare className="h-3.5 w-3.5" /> Permissões
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => onDemote(t.id)}
                  disabled={isDemoting}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ allUsers, onPromote, isPromoting }: {
  allUsers: any[];
  onPromote: (id: number) => void;
  isPromoting: boolean;
}) {
  const [search, setSearch] = useState("");
  const users = allUsers.filter(u => u.role === "user");
  const filtered = users.filter(u =>
    !search || (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar usuário por nome ou email..."
          className="pl-9 h-9 text-sm"
        />
      </div>
      <div className="space-y-2 max-h-[480px] overflow-y-auto">
        {filtered.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.name || "Sem nome"}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <Button
              size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0"
              onClick={() => onPromote(u.id)}
              disabled={isPromoting}
            >
              <UserPlus className="h-3.5 w-3.5" /> Tornar Professor
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CoordinatorPanel() {
  const { user } = useAuth();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [permTab, setPermTab] = useState(false);

  const teacherIdInput = useMemo(() => ({ teacherId: selectedTeacherId! }), [selectedTeacherId]);

  const { data: stats } = trpc.coordinator.getPlatformStats.useQuery();
  const { data: teachers = [], refetch: refetchTeachers } = trpc.coordinator.listTeachers.useQuery();
  const { data: allUsers = [] } = trpc.coordinator.listUsers.useQuery();
  const { data: activityLogs = [] } = trpc.coordinator.getActivityLog.useQuery({ limit: 50 });
  const { data: disciplines = [] } = trpc.questions.disciplines.useQuery();
  const { data: teacherPerms = [], refetch: refetchPerms } = trpc.coordinator.getTeacherPermissions.useQuery(
    teacherIdInput, { enabled: !!selectedTeacherId }
  );

  const promoteMutation = trpc.coordinator.promoteToTeacher.useMutation({
    onSuccess: () => { toast.success("Usuário promovido a Professor"); refetchTeachers(); },
    onError: e => toast.error(e.message),
  });
  const demoteMutation = trpc.coordinator.demoteToUser.useMutation({
    onSuccess: () => { toast.success("Professor removido"); refetchTeachers(); },
    onError: e => toast.error(e.message),
  });
  const grantMutation = trpc.coordinator.grantPermission.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada"); refetchPerms(); },
    onError: e => toast.error(e.message),
  });
  const revokeMutation = trpc.coordinator.revokePermission.useMutation({
    onSuccess: () => { toast.success("Permissão removida"); refetchPerms(); },
    onError: e => toast.error(e.message),
  });

  const allowed = ["coordinator", "superuser", "admin"];
  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm">Apenas coordenadores podem acessar esta área.</p>
          <Link href="/"><Button className="mt-4">Voltar ao início</Button></Link>
        </Card>
      </div>
    );
  }

  const actionLabels: Record<string, string> = {
    promote_to_teacher: "Promoveu a Professor",
    demote_to_user: "Rebaixou para Usuário",
    grant_permission: "Concedeu Permissão",
    revoke_permission: "Revogou Permissão",
    create_question: "Criou Questão",
    validate_question_approved: "Aprovou Questão",
    validate_question_rejected: "Rejeitou Questão",
  };

  const handleGrant = (disciplineId: number, opts: { canCreate: boolean; canValidate: boolean; canExams: boolean }) => {
    if (!selectedTeacherId) return;
    grantMutation.mutate({
      teacherId: selectedTeacherId,
      disciplineId,
      canCreateQuestions: opts.canCreate,
      canValidateQuestions: opts.canValidate,
      canCreateExams: opts.canExams,
    });
  };

  const selectedTeacher = teachers.find((t: any) => t.id === selectedTeacherId);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Painel do Coordenador</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie professores, permissões, o banco de questões e monitore atividades.
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total de Usuários", value: stats.users?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
              { label: "Professores", value: stats.users?.teachers ?? 0, icon: BookOpen, color: "text-emerald-400" },
              { label: "Questões Pendentes", value: stats.questions?.pendingQuestions ?? 0, icon: CheckSquare, color: "text-amber-400" },
              { label: "Simulados Hoje", value: stats.exams?.examsToday ?? 0, icon: BarChart2, color: "text-purple-400" },
            ].map(s => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="questions">
          <TabsList className="mb-6 h-auto flex-wrap gap-1">
            <TabsTrigger value="questions" className="gap-1.5 text-sm">
              <BookOpen className="h-3.5 w-3.5" /> Banco de Questões
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5" /> Professores
              {teachers.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{teachers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-sm">
              <Shield className="h-3.5 w-3.5" /> Permissões
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-sm">
              <UserPlus className="h-3.5 w-3.5" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5 text-sm">
              <Send className="h-3.5 w-3.5" /> Atribuições
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-sm">
              <Activity className="h-3.5 w-3.5" /> Atividades
            </TabsTrigger>
          </TabsList>

          {/* Banco de Questões */}
          <TabsContent value="questions">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Banco de Questões</h2>
              <p className="text-sm text-muted-foreground">
                Visualize, filtre e atribua questões para validação pelos professores.
              </p>
            </div>
            <QuestionBankTab />
          </TabsContent>

          {/* Professores */}
          <TabsContent value="teachers">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Professores Cadastrados</h2>
              <p className="text-sm text-muted-foreground">
                Gerencie os professores da plataforma e acesse rapidamente suas permissões.
              </p>
            </div>
            <TeachersTab
              teachers={teachers}
              onPermissions={id => { setSelectedTeacherId(id); document.querySelector('[data-value="permissions"]')?.dispatchEvent(new MouseEvent("click")); }}
              onDemote={id => demoteMutation.mutate({ userId: id })}
              isDemoting={demoteMutation.isPending}
            />
          </TabsContent>

          {/* Permissões */}
          <TabsContent value="permissions">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Permissões por Grande Área</h2>
              <p className="text-sm text-muted-foreground">
                Controle quais disciplinas cada professor pode criar questões, validar e criar simulados.
              </p>
            </div>

            <div className="space-y-4">
              {/* Teacher selector */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <Label className="text-sm font-medium">Selecionar Professor</Label>
                {teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum professor cadastrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teachers.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeacherId(t.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedTeacherId === t.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 border-border/50 hover:border-primary/50"
                        }`}
                      >
                        {t.name || t.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTeacherId ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Disciplinas de{" "}
                      <span className="text-foreground font-medium">{selectedTeacher?.name || selectedTeacher?.email}</span>:
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {teacherPerms.length} / {disciplines.length} autorizadas
                    </Badge>
                  </div>
                  {disciplines.map((d: any) => {
                    const perm = teacherPerms.find((p: any) => p.disciplineId === d.id);
                    return (
                      <PermRow
                        key={d.id}
                        discipline={d}
                        perm={perm}
                        onGrant={handleGrant}
                        onRevoke={permId => revokeMutation.mutate({ permissionId: permId })}
                        isGranting={grantMutation.isPending}
                        isRevoking={revokeMutation.isPending}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecione um professor acima para gerenciar suas permissões.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="users">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Usuários</h2>
              <p className="text-sm text-muted-foreground">Promova usuários ao papel de Professor para que possam criar e validar questões.</p>
            </div>
            <UsersTab
              allUsers={allUsers}
              onPromote={id => promoteMutation.mutate({ userId: id })}
              isPromoting={promoteMutation.isPending}
            />
          </TabsContent>

          {/* Atribuições */}
          <TabsContent value="assignments">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Gerenciar Atribuições de Validação</h2>
              <p className="text-sm text-muted-foreground">
                Atribua questões pendentes a professores, acompanhe o progresso e veja o histórico de aprovações e recusas.
              </p>
            </div>
            <QuestionAssignmentPanel />
          </TabsContent>

          {/* Atividades */}
          <TabsContent value="activity">
            <div className="mb-4">
              <h2 className="font-serif text-xl font-bold mb-1">Log de Atividades</h2>
              <p className="text-sm text-muted-foreground">Últimas 50 ações realizadas na plataforma.</p>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {activityLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/40">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-primary font-medium">{log.userName || "Sistema"}</span>
                      {" — "}
                      {actionLabels[log.action] || log.action}
                    </p>
                    {log.details && typeof log.details === "object" && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
              {activityLogs.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma atividade registrada.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
