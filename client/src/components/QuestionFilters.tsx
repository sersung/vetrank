import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Filter, Save, BookmarkCheck, X, Search } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionFilterState = {
  search?: string;
  questionMode?: "multiple_choice" | "discursive" | "all";
  questionType?: string;
  disciplineId?: number;
  subjectId?: number;
  banca?: string;
  instituicao?: string;
  cargo?: string;
  carreira?: string;
  areaFormacao?: string;
  escolaridade?: string;
  difficulty?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  author?: string;
  hasExplanation?: boolean;
  myAnswers?: "answered" | "unanswered" | "correct" | "incorrect";
  includeAnuladas?: boolean;
  includeDesatualizadas?: boolean;
  // Admin-only
  status?: string;
  isValidated?: boolean;
  orderBy?: "newest" | "oldest" | "year_desc" | "year_asc";
};

export const EMPTY_FILTERS: QuestionFilterState = {};

type Props = {
  filters: QuestionFilterState;
  onChange: (f: QuestionFilterState) => void;
  onApply: () => void;
  showAdminFields?: boolean;
};

// ─── Label maps ──────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  very_easy: "Muito Fácil",
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  very_hard: "Muito Difícil",
};

const QTYPE_LABELS: Record<string, string> = {
  multiple_choice: "Múltipla Escolha",
  assertion_reason: "Asserção-Razão",
  complex_multiple_choice: "Múltipla Complexa",
  matching: "Associação",
  true_false: "Verdadeiro/Falso",
  ordering: "Ordenação",
  cloze: "Lacunas (Cloze)",
  clinical_case: "Caso Clínico",
  image_analysis: "Análise de Imagem",
  interpretation: "Interpretação de Dados",
};

const ESCOLARIDADE_LABELS: Record<string, string> = {
  fundamental: "Ensino Fundamental",
  medio: "Ensino Médio",
  superior: "Ensino Superior",
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function SelectFilter({
  label, value, onChange, placeholder, options,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? "__all__"}
        onValueChange={v => onChange(v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ComboFilter({
  label, value, onChange, placeholder, options,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? "__all__"}
        onValueChange={v => onChange(v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map(o => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuestionFilters({ filters, onChange, onApply, showAdminFields = false }: Props) {
  const { isAuthenticated, user } = useAuth();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const set = <K extends keyof QuestionFilterState>(key: K, val: QuestionFilterState[K]) =>
    onChange({ ...filters, [key]: val });
  const unset = <K extends keyof QuestionFilterState>(key: K) => {
    const next = { ...filters };
    delete next[key];
    onChange(next);
  };

  // Remote data
  const { data: disciplines = [] } = trpc.questions.disciplines.useQuery();
  const { data: subjects = [] } = trpc.questions.subjects.useQuery(
    { disciplineId: filters.disciplineId! },
    { enabled: !!filters.disciplineId }
  );
  const { data: bancas = [] } = trpc.questions.distinctBancas.useQuery();
  const { data: instituicoes = [] } = trpc.questions.distinctInstituicoes.useQuery();
  const { data: cargos = [] } = trpc.questions.distinctCargos.useQuery();
  const { data: carreiras = [] } = trpc.questions.distinctCarreiras.useQuery();
  const { data: areas = [] } = trpc.questions.distinctAreasFormacao.useQuery();
  const { data: years = [] } = trpc.questions.distinctYears.useQuery();
  const { data: savedFiltersList = [], refetch: refetchSaved } =
    trpc.questions.savedFilters.useQuery(undefined, { enabled: isAuthenticated });

  const saveMutation = trpc.questions.saveFilter.useMutation({
    onSuccess: () => { refetchSaved(); setSaveDialogOpen(false); setSaveName(""); },
  });
  const deleteMutation = trpc.questions.deleteSavedFilter.useMutation({
    onSuccess: () => refetchSaved(),
  });

  // Count active filters (excluding pagination / order)
  const activeCount = Object.entries(filters).filter(([k, v]) =>
    !["orderBy", "page", "limit"].includes(k) && v !== undefined && v !== false
  ).length;

  return (
    <div className="space-y-3">
      {/* ── Row 1: Search + Mode + Apply ── */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar no enunciado, banca ou instituição..."
            value={filters.search ?? ""}
            onChange={e => e.target.value ? set("search", e.target.value) : unset("search")}
            onKeyDown={e => e.key === "Enter" && onApply()}
          />
        </div>

        <Select
          value={filters.questionMode ?? "all"}
          onValueChange={v => set("questionMode", v as any)}
        >
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alternativas + Discursivas</SelectItem>
            <SelectItem value="multiple_choice">Alternativas</SelectItem>
            <SelectItem value="discursive">Discursivas</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" onClick={onApply} className="h-8 gap-1">
          <Filter className="h-3.5 w-3.5" /> Filtrar
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{activeCount}</Badge>
          )}
        </Button>

        {activeCount > 0 && (
          <Button size="sm" variant="ghost" className="h-8" onClick={() => onChange(EMPTY_FILTERS)}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* ── Row 2: Main filters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {/* Discipline */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Disciplina</Label>
          <Select
            value={filters.disciplineId?.toString() ?? "__all__"}
            onValueChange={v => {
              if (v === "__all__") { unset("disciplineId"); unset("subjectId"); }
              else { set("disciplineId", Number(v)); unset("subjectId"); }
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {disciplines.map((d: any) => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.namePt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject — cascades from discipline */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Assunto</Label>
          <Select
            value={filters.subjectId?.toString() ?? "__all__"}
            onValueChange={v => v === "__all__" ? unset("subjectId") : set("subjectId", Number(v))}
            disabled={!filters.disciplineId}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={filters.disciplineId ? "Todos" : "Selecione disciplina"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.namePt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SelectFilter
          label="Dificuldade"
          value={filters.difficulty}
          onChange={v => v ? set("difficulty", v) : unset("difficulty")}
          placeholder="Todas"
          options={Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <ComboFilter
          label="Banca"
          value={filters.banca}
          onChange={v => v ? set("banca", v) : unset("banca")}
          placeholder="Todas"
          options={bancas}
        />

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select
            value={filters.year?.toString() ?? "__all__"}
            onValueChange={v => v === "__all__" ? unset("year") : set("year", Number(v))}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {years.map((y: number) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Advanced filters (collapsible) ── */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
            {advancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {advancedOpen ? "Menos filtros" : "Mais filtros"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            <ComboFilter
              label="Instituição"
              value={filters.instituicao}
              onChange={v => v ? set("instituicao", v) : unset("instituicao")}
              placeholder="Todas"
              options={instituicoes}
            />
            <ComboFilter
              label="Cargo"
              value={filters.cargo}
              onChange={v => v ? set("cargo", v) : unset("cargo")}
              placeholder="Todos"
              options={cargos}
            />
            <ComboFilter
              label="Carreira"
              value={filters.carreira}
              onChange={v => v ? set("carreira", v) : unset("carreira")}
              placeholder="Todas"
              options={carreiras}
            />
            <ComboFilter
              label="Área de Formação"
              value={filters.areaFormacao}
              onChange={v => v ? set("areaFormacao", v) : unset("areaFormacao")}
              placeholder="Todas"
              options={areas}
            />
            <SelectFilter
              label="Escolaridade"
              value={filters.escolaridade}
              onChange={v => v ? set("escolaridade", v) : unset("escolaridade")}
              placeholder="Todas"
              options={Object.entries(ESCOLARIDADE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <SelectFilter
              label="Tipo de Questão"
              value={filters.questionType}
              onChange={v => v ? set("questionType", v) : unset("questionType")}
              placeholder="Todos"
              options={Object.entries(QTYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <SelectFilter
              label="Ordenar por"
              value={filters.orderBy}
              onChange={v => v ? set("orderBy", v as any) : unset("orderBy")}
              placeholder="Mais recentes"
              options={[
                { value: "newest", label: "Mais recentes" },
                { value: "oldest", label: "Mais antigas" },
                { value: "year_desc", label: "Ano (↓)" },
                { value: "year_asc", label: "Ano (↑)" },
              ]}
            />

            {/* Minhas questões — requires auth */}
            {isAuthenticated && (
              <SelectFilter
                label="Minhas Questões"
                value={filters.myAnswers}
                onChange={v => v ? set("myAnswers", v as any) : unset("myAnswers")}
                placeholder="Todas"
                options={[
                  { value: "answered", label: "Respondidas" },
                  { value: "unanswered", label: "Não respondidas" },
                  { value: "correct", label: "Acertei" },
                  { value: "incorrect", label: "Errei" },
                ]}
              />
            )}

            {/* Comentários / explicação */}
            <SelectFilter
              label="Comentários"
              value={filters.hasExplanation ? "has_ai" : undefined}
              onChange={v => v === "has_ai" ? set("hasExplanation", true) : unset("hasExplanation")}
              placeholder="Todos"
              options={[{ value: "has_ai", label: "Com explicação IA" }]}
            />

            {/* Admin-only */}
            {showAdminFields && (
              <SelectFilter
                label="Validação"
                value={
                  filters.isValidated === true ? "validated" :
                  filters.isValidated === false ? "pending_val" : undefined
                }
                onChange={v => {
                  if (v === "validated") set("isValidated", true);
                  else if (v === "pending_val") set("isValidated", false);
                  else unset("isValidated");
                }}
                placeholder="Todas"
                options={[
                  { value: "validated", label: "Validadas" },
                  { value: "pending_val", label: "Não validadas" },
                ]}
              />
            )}
            {showAdminFields && (
              <SelectFilter
                label="Status"
                value={filters.status}
                onChange={v => v ? set("status", v) : unset("status")}
                placeholder="Todos"
                options={[
                  { value: "approved", label: "Aprovadas" },
                  { value: "pending", label: "Pendentes" },
                  { value: "rejected", label: "Rejeitadas" },
                ]}
              />
            )}
          </div>

          {/* Checkboxes row */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={!!filters.includeAnuladas}
                onCheckedChange={v => v ? set("includeAnuladas", true) : unset("includeAnuladas")}
              />
              Incluir anuladas
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={!!filters.includeDesatualizadas}
                onCheckedChange={v => v ? set("includeDesatualizadas", true) : unset("includeDesatualizadas")}
              />
              Incluir desatualizadas
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Save / Load filter buttons ── */}
      {isAuthenticated && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-3 w-3" /> Salvar filtro
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLoadDialogOpen(true)}>
            <BookmarkCheck className="h-3 w-3" /> Filtros salvos
            {savedFiltersList.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{savedFiltersList.length}</Badge>
            )}
          </Button>
        </div>
      )}

      {/* ── Save dialog ── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salvar filtro</DialogTitle></DialogHeader>
          <Input
            placeholder="Nome do filtro (ex: Cirurgia 2022–2024)"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveName && saveMutation.mutate({ name: saveName, filters })}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!saveName || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ name: saveName, filters })}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Load dialog ── */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Filtros salvos</DialogTitle></DialogHeader>
          {savedFiltersList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum filtro salvo ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {savedFiltersList.map((sf: any) => (
                <li key={sf.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <button
                    className="flex-1 text-left text-sm font-medium hover:text-primary"
                    onClick={() => { onChange(sf.filters as QuestionFilterState); setLoadDialogOpen(false); onApply(); }}
                  >
                    {sf.name}
                  </button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={() => deleteMutation.mutate({ id: sf.id })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
