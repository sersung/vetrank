/**
 * QuestionFormats.tsx
 * Format-specific form sections for each question type.
 * Used by AdminPanel and TeacherPanel question creation dialogs.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";

// ─── Type definitions ─────────────────────────────────────────────────────────

export type QuestionType =
  | "multiple_choice"
  | "assertion_reason"
  | "complex_multiple_choice"
  | "matching"
  | "true_false"
  | "ordering"
  | "cloze"
  | "clinical_case"
  | "image_analysis"
  | "interpretation"
  | "discursive";

export const QUESTION_TYPE_LABELS: Record<QuestionType, { pt: string; en: string; description: string }> = {
  multiple_choice: { pt: "Múltipla Escolha Simples", en: "Simple Multiple Choice", description: "5 alternativas A-E, apenas uma correta" },
  assertion_reason: { pt: "Asserção-Razão (ENADE)", en: "Assertion-Reason (ENADE)", description: "Proposições I e II com PORQUE, 5 opções fixas" },
  complex_multiple_choice: { pt: "Múltipla Escolha Complexa", en: "Complex Multiple Choice", description: "Itens I/II/III com combinações de alternativas" },
  matching: { pt: "Associação (Matching)", en: "Matching / Association", description: "Coluna A ↔ Coluna B" },
  true_false: { pt: "Verdadeiro ou Falso Sequencial", en: "True/False Sequential", description: "Lista de afirmações com sequência V/F nas alternativas" },
  ordering: { pt: "Ordenação / Sequenciamento", en: "Ordering / Sequencing", description: "Organizar etapas em ordem correta" },
  cloze: { pt: "Preenchimento de Lacunas (Cloze)", en: "Fill-in-the-Blank (Cloze)", description: "Texto com [BLANK] + alternativas de preenchimento" },
  clinical_case: { pt: "Caso Clínico", en: "Clinical Case", description: "Anamnese/exames + alternativas" },
  image_analysis: { pt: "Análise de Imagem/Gráfico", en: "Image/Graph Analysis", description: "Imagem ou gráfico + alternativas" },
  interpretation: { pt: "Interpretação de Dados", en: "Data Interpretation", description: "Tabela/resultado laboratorial + alternativas" },
  discursive: { pt: "Discursiva", en: "Discursive", description: "Resposta aberta, sem alternativas" },
};

// Fixed assertion-reason options (ENADE standard)
export const ASSERTION_REASON_OPTIONS = [
  { id: "1", textPt: "As afirmativas I e II são verdadeiras, e a II é uma justificativa correta da I.", textEn: "Statements I and II are true, and II is a correct justification for I." },
  { id: "2", textPt: "As afirmativas I e II são verdadeiras, mas a II não é uma justificativa correta da I.", textEn: "Statements I and II are true, but II is not a correct justification for I." },
  { id: "3", textPt: "A afirmativa I é verdadeira e a II é falsa.", textEn: "Statement I is true and statement II is false." },
  { id: "4", textPt: "A afirmativa I é falsa e a II é verdadeira.", textEn: "Statement I is false and statement II is true." },
  { id: "5", textPt: "As afirmativas I e II são falsas.", textEn: "Both statements I and II are false." },
];

// ─── FormatData types ─────────────────────────────────────────────────────────

export interface ComplexMCItem { id: string; textPt: string; textEn?: string }
export interface MatchingPair { colA: string; colB: string }
export interface TrueFalseStatement { id: string; textPt: string; textEn?: string }
export interface OrderingStep { id: string; textPt: string; textEn?: string }
export interface ClozeBlank { id: string; answer: string }

export interface FormatData {
  // complex_multiple_choice
  items?: ComplexMCItem[];
  // matching
  pairs?: MatchingPair[];
  columnALabel?: string;
  columnBLabel?: string;
  // true_false
  statements?: TrueFalseStatement[];
  // ordering
  steps?: OrderingStep[];
  // cloze
  clozeText?: string;
  blanks?: ClozeBlank[];
  // image_analysis / clinical_case / interpretation
  imageUrl?: string;
  caseText?: string;
  tableData?: string; // markdown table or plain text
}

// ─── Helper: simple textarea ──────────────────────────────────────────────────
const TA = ({ placeholder, value, onChange, rows = 3 }: { placeholder: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
  />
);

// ─── Assertion-Reason Section ─────────────────────────────────────────────────
export function AssertionReasonSection({
  assertion1, assertion2, correctOption, lang,
  onChange,
}: {
  assertion1: string; assertion2: string; correctOption: string; lang: "pt" | "en";
  onChange: (field: "assertion1" | "assertion2" | "correctOption", value: string) => void;
}) {
  return (
    <div className="space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <p className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">
        {lang === "pt" ? "Proposições (Asserção-Razão)" : "Propositions (Assertion-Reason)"}
      </p>
      <TA
        placeholder={lang === "pt" ? "Afirmativa I (Asserção) *" : "Statement I (Assertion) *"}
        value={assertion1}
        onChange={(v) => onChange("assertion1", v)}
      />
      <div className="text-center text-xs font-sans font-bold text-muted-foreground py-1">
        {lang === "pt" ? "PORQUE" : "BECAUSE"}
      </div>
      <TA
        placeholder={lang === "pt" ? "Afirmativa II (Razão) *" : "Statement II (Reason) *"}
        value={assertion2}
        onChange={(v) => onChange("assertion2", v)}
      />
      <div className="p-2 bg-background rounded border border-border/30 space-y-1">
        <p className="text-xs font-sans font-medium text-muted-foreground mb-1">
          {lang === "pt" ? "Alternativas fixas (padrão ENADE):" : "Fixed options (ENADE standard):"}
        </p>
        {ASSERTION_REASON_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange("correctOption", opt.id)}
            className={`w-full text-left text-xs font-sans p-2 rounded transition-colors ${
              correctOption === opt.id
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <span className="font-bold mr-2">{opt.id}.</span>
            {lang === "pt" ? opt.textPt : opt.textEn}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Complex Multiple Choice Section ─────────────────────────────────────────
export function ComplexMCSection({
  items, options, correctOption, lang,
  onItemsChange, onOptionsChange, onCorrectChange,
}: {
  items: ComplexMCItem[];
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onItemsChange: (items: ComplexMCItem[]) => void;
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const addItem = () => onItemsChange([...items, { id: toRoman(items.length + 1), textPt: "", textEn: "" }]);
  const removeItem = (i: number) => onItemsChange(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ComplexMCItem, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onItemsChange(next);
  };

  const addOption = () => {
    const letters = "ABCDE";
    const id = letters[options.length] || String(options.length + 1);
    onOptionsChange([...options, { id, textPt: "", textEn: "" }]);
  };
  const removeOption = (i: number) => onOptionsChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: string, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], [field]: val };
    onOptionsChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Items I, II, III... */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">
            {lang === "pt" ? "Itens (I, II, III...)" : "Items (I, II, III...)"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Adicionar Item" : "Add Item"}
          </Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs font-bold text-primary mt-3 w-8 shrink-0">{item.id}.</span>
            <div className="flex-1 space-y-1">
              <Input
                placeholder={`Item ${item.id} PT *`}
                value={item.textPt}
                onChange={(e) => updateItem(i, "textPt", e.target.value)}
                className="font-sans bg-background text-sm"
              />
              <Input
                placeholder={`Item ${item.id} EN`}
                value={item.textEn || ""}
                onChange={(e) => updateItem(i, "textEn", e.target.value)}
                className="font-sans bg-background text-sm"
              />
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(i)} className="h-8 w-8 shrink-0 mt-1 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Combination options A, B, C... */}
      <div className="p-3 bg-accent/20 border border-border/30 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "pt" ? "Alternativas (combinações)" : "Options (combinations)"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={options.length >= 5} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Alternativa" : "Option"}
          </Button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className={`text-xs font-bold w-6 shrink-0 ${correctOption === opt.id ? "text-green-400" : "text-muted-foreground"}`}>{opt.id})</span>
            <Input
              placeholder={`${lang === "pt" ? "Ex: Apenas I e III estão corretas" : "E.g. Only I and III are correct"}`}
              value={opt.textPt}
              onChange={(e) => updateOption(i, "textPt", e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${correctOption === opt.id ? "bg-green-500/20 border-green-500/40 text-green-400" : "border-border/30 text-muted-foreground hover:border-primary/40"}`}
            >
              ✓
            </button>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Matching Section ─────────────────────────────────────────────────────────
export function MatchingSection({
  pairs, options, correctOption, lang,
  onPairsChange, onOptionsChange, onCorrectChange,
}: {
  pairs: MatchingPair[];
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onPairsChange: (pairs: MatchingPair[]) => void;
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const addPair = () => onPairsChange([...pairs, { colA: "", colB: "" }]);
  const removePair = (i: number) => onPairsChange(pairs.filter((_, idx) => idx !== i));
  const updatePair = (i: number, field: "colA" | "colB", val: string) => {
    const next = [...pairs];
    next[i] = { ...next[i], [field]: val };
    onPairsChange(next);
  };

  const addOption = () => {
    const letters = "ABCDE";
    const id = letters[options.length] || String(options.length + 1);
    onOptionsChange([...options, { id, textPt: "", textEn: "" }]);
  };
  const removeOption = (i: number) => onOptionsChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], textPt: val };
    onOptionsChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">
            {lang === "pt" ? "Pares (Coluna A ↔ Coluna B)" : "Pairs (Column A ↔ Column B)"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addPair} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Par" : "Pair"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs font-sans font-semibold text-muted-foreground px-1 mb-1">
          <span>{lang === "pt" ? "Coluna A" : "Column A"}</span>
          <span>{lang === "pt" ? "Coluna B" : "Column B"}</span>
        </div>
        {pairs.map((pair, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs font-bold text-primary w-5 shrink-0">{i + 1}.</span>
            <Input placeholder={`A${i + 1}`} value={pair.colA} onChange={(e) => updatePair(i, "colA", e.target.value)} className="font-sans bg-background text-sm flex-1" />
            <span className="text-muted-foreground text-xs">↔</span>
            <Input placeholder={`B${i + 1}`} value={pair.colB} onChange={(e) => updatePair(i, "colB", e.target.value)} className="font-sans bg-background text-sm flex-1" />
            <Button type="button" size="icon" variant="ghost" onClick={() => removePair(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="p-3 bg-accent/20 border border-border/30 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "pt" ? "Alternativas de correspondência" : "Matching options"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={options.length >= 5} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Alternativa" : "Option"}
          </Button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className={`text-xs font-bold w-6 shrink-0 ${correctOption === opt.id ? "text-green-400" : "text-muted-foreground"}`}>{opt.id})</span>
            <Input
              placeholder={lang === "pt" ? "Ex: 1-C, 2-A, 3-B, 4-D" : "E.g. 1-C, 2-A, 3-B, 4-D"}
              value={opt.textPt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${correctOption === opt.id ? "bg-green-500/20 border-green-500/40 text-green-400" : "border-border/30 text-muted-foreground hover:border-primary/40"}`}
            >
              ✓
            </button>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── True/False Sequential Section ───────────────────────────────────────────
export function TrueFalseSection({
  statements, options, correctOption, lang,
  onStatementsChange, onOptionsChange, onCorrectChange,
}: {
  statements: TrueFalseStatement[];
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onStatementsChange: (s: TrueFalseStatement[]) => void;
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const addStatement = () => {
    const id = toRoman(statements.length + 1);
    onStatementsChange([...statements, { id, textPt: "", textEn: "" }]);
  };
  const removeStatement = (i: number) => onStatementsChange(statements.filter((_, idx) => idx !== i));
  const updateStatement = (i: number, field: keyof TrueFalseStatement, val: string) => {
    const next = [...statements];
    next[i] = { ...next[i], [field]: val };
    onStatementsChange(next);
  };

  const generateVFOptions = () => {
    if (statements.length === 0) return;
    const count = statements.length;
    const combos = generateVFCombinations(count).slice(0, 5);
    const letters = "ABCDE";
    const opts = combos.map((combo, i) => ({
      id: letters[i],
      textPt: combo.join(", "),
      textEn: combo.join(", "),
    }));
    onOptionsChange(opts);
  };

  const addOption = () => {
    const letters = "ABCDE";
    const id = letters[options.length] || String(options.length + 1);
    onOptionsChange([...options, { id, textPt: "", textEn: "" }]);
  };
  const removeOption = (i: number) => onOptionsChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], textPt: val };
    onOptionsChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">
            {lang === "pt" ? "Afirmações" : "Statements"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addStatement} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Afirmação" : "Statement"}
          </Button>
        </div>
        {statements.map((s, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs font-bold text-primary mt-2 w-8 shrink-0">{s.id}.</span>
            <Input
              placeholder={`${lang === "pt" ? "Afirmação" : "Statement"} ${s.id} *`}
              value={s.textPt}
              onChange={(e) => updateStatement(i, "textPt", e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeStatement(i)} className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="p-3 bg-accent/20 border border-border/30 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "pt" ? "Sequências V/F" : "V/F Sequences"}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={generateVFOptions} disabled={statements.length === 0} className="h-7 text-xs font-sans">
              {lang === "pt" ? "Gerar automático" : "Auto-generate"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={options.length >= 5} className="h-7 text-xs font-sans">
              <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Manual" : "Manual"}
            </Button>
          </div>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className={`text-xs font-bold w-6 shrink-0 ${correctOption === opt.id ? "text-green-400" : "text-muted-foreground"}`}>{opt.id})</span>
            <Input
              placeholder={lang === "pt" ? "Ex: V, F, V, F, V" : "E.g. T, F, T, F, T"}
              value={opt.textPt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${correctOption === opt.id ? "bg-green-500/20 border-green-500/40 text-green-400" : "border-border/30 text-muted-foreground hover:border-primary/40"}`}
            >
              ✓
            </button>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ordering Section ─────────────────────────────────────────────────────────
export function OrderingSection({
  steps, options, correctOption, lang,
  onStepsChange, onOptionsChange, onCorrectChange,
}: {
  steps: OrderingStep[];
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onStepsChange: (s: OrderingStep[]) => void;
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const addStep = () => onStepsChange([...steps, { id: String(steps.length + 1), textPt: "", textEn: "" }]);
  const removeStep = (i: number) => onStepsChange(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof OrderingStep, val: string) => {
    const next = [...steps];
    next[i] = { ...next[i], [field]: val };
    onStepsChange(next);
  };

  const addOption = () => {
    const letters = "ABCDE";
    const id = letters[options.length] || String(options.length + 1);
    onOptionsChange([...options, { id, textPt: "", textEn: "" }]);
  };
  const removeOption = (i: number) => onOptionsChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], textPt: val };
    onOptionsChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-primary uppercase tracking-wide">
            {lang === "pt" ? "Etapas (em ordem correta)" : "Steps (in correct order)"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addStep} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Etapa" : "Step"}
          </Button>
        </div>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-center">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <span className="text-xs font-bold text-primary w-5 shrink-0">{step.id}.</span>
            <Input
              placeholder={`${lang === "pt" ? "Etapa" : "Step"} ${step.id} *`}
              value={step.textPt}
              onChange={(e) => updateStep(i, "textPt", e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground font-sans">
          {lang === "pt" ? "As alternativas abaixo apresentarão as etapas em ordens diferentes." : "The options below will present the steps in different orders."}
        </p>
      </div>

      <div className="p-3 bg-accent/20 border border-border/30 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">
            {lang === "pt" ? "Alternativas de ordenação" : "Ordering options"}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={options.length >= 5} className="h-7 text-xs font-sans">
            <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Alternativa" : "Option"}
          </Button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className={`text-xs font-bold w-6 shrink-0 ${correctOption === opt.id ? "text-green-400" : "text-muted-foreground"}`}>{opt.id})</span>
            <Input
              placeholder={lang === "pt" ? "Ex: 1 → 3 → 2 → 4 → 5" : "E.g. 1 → 3 → 2 → 4 → 5"}
              value={opt.textPt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="font-sans bg-background text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onCorrectChange(opt.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${correctOption === opt.id ? "bg-green-500/20 border-green-500/40 text-green-400" : "border-border/30 text-muted-foreground hover:border-primary/40"}`}
            >
              ✓
            </button>
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cloze Section ────────────────────────────────────────────────────────────
export function ClozeSection({
  options, correctOption, lang,
  onOptionsChange, onCorrectChange,
}: {
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const addOption = () => {
    const letters = "ABCDE";
    const id = letters[options.length] || String(options.length + 1);
    onOptionsChange([...options, { id, textPt: "", textEn: "" }]);
  };
  const removeOption = (i: number) => onOptionsChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: string, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], [field]: val };
    onOptionsChange(next);
  };

  return (
    <div className="p-3 bg-accent/20 border border-border/30 rounded-lg space-y-2">
      <p className="text-xs font-sans text-muted-foreground mb-2">
        {lang === "pt"
          ? "Use [BLANK] no texto da questão para marcar as lacunas. As alternativas abaixo contêm as sequências de preenchimento."
          : "Use [BLANK] in the question text to mark gaps. Options below contain fill-in sequences."}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide">
          {lang === "pt" ? "Alternativas de preenchimento" : "Fill-in options"}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={addOption} disabled={options.length >= 5} className="h-7 text-xs font-sans">
          <Plus className="h-3 w-3 mr-1" />{lang === "pt" ? "Alternativa" : "Option"}
        </Button>
      </div>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className={`text-xs font-bold w-6 shrink-0 ${correctOption === opt.id ? "text-green-400" : "text-muted-foreground"}`}>{opt.id})</span>
          <Input
            placeholder={lang === "pt" ? "Ex: insulina — glucagon — cortisol" : "E.g. insulin — glucagon — cortisol"}
            value={opt.textPt}
            onChange={(e) => updateOption(i, "textPt", e.target.value)}
            className="font-sans bg-background text-sm flex-1"
          />
          <button
            type="button"
            onClick={() => onCorrectChange(opt.id)}
            className={`text-xs px-2 py-1 rounded border transition-colors shrink-0 ${correctOption === opt.id ? "bg-green-500/20 border-green-500/40 text-green-400" : "border-border/30 text-muted-foreground hover:border-primary/40"}`}
          >
            ✓
          </button>
          <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Image/Clinical/Interpretation Section ────────────────────────────────────
export function MediaSection({
  questionType, imageUrl, caseText, tableData, lang,
  onChange,
}: {
  questionType: QuestionType;
  imageUrl?: string;
  caseText?: string;
  tableData?: string;
  lang: "pt" | "en";
  onChange: (field: "imageUrl" | "caseText" | "tableData", val: string) => void;
}) {
  if (questionType === "clinical_case") {
    return (
      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
        <p className="text-xs font-sans font-semibold text-amber-400 uppercase tracking-wide">
          {lang === "pt" ? "Dados do Caso Clínico" : "Clinical Case Data"}
        </p>
        <TA
          placeholder={lang === "pt" ? "Anamnese, achados clínicos, exames laboratoriais, etc." : "Anamnesis, clinical findings, lab results, etc."}
          value={caseText || ""}
          onChange={(v) => onChange("caseText", v)}
          rows={4}
        />
        <Input
          placeholder={lang === "pt" ? "URL de imagem (radiografia, ultrassom, etc.) — opcional" : "Image URL (X-ray, ultrasound, etc.) — optional"}
          value={imageUrl || ""}
          onChange={(e) => onChange("imageUrl", e.target.value)}
          className="font-sans bg-background text-sm"
        />
      </div>
    );
  }
  if (questionType === "image_analysis") {
    return (
      <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
        <p className="text-xs font-sans font-semibold text-blue-400 uppercase tracking-wide">
          {lang === "pt" ? "Imagem / Gráfico" : "Image / Graph"}
        </p>
        <Input
          placeholder={lang === "pt" ? "URL da imagem ou gráfico *" : "Image or graph URL *"}
          value={imageUrl || ""}
          onChange={(e) => onChange("imageUrl", e.target.value)}
          className="font-sans bg-background text-sm"
        />
        <TA
          placeholder={lang === "pt" ? "Legenda ou contexto da imagem (opcional)" : "Image caption or context (optional)"}
          value={caseText || ""}
          onChange={(v) => onChange("caseText", v)}
          rows={2}
        />
      </div>
    );
  }
  if (questionType === "interpretation") {
    return (
      <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2">
        <p className="text-xs font-sans font-semibold text-purple-400 uppercase tracking-wide">
          {lang === "pt" ? "Dados / Tabela / Resultado" : "Data / Table / Result"}
        </p>
        <TA
          placeholder={lang === "pt" ? "Cole a tabela, resultado laboratorial ou dados em texto (Markdown aceito)" : "Paste table, lab result or data in text (Markdown accepted)"}
          value={tableData || ""}
          onChange={(v) => onChange("tableData", v)}
          rows={5}
        />
        <Input
          placeholder={lang === "pt" ? "URL de imagem complementar (opcional)" : "Supplementary image URL (optional)"}
          value={imageUrl || ""}
          onChange={(e) => onChange("imageUrl", e.target.value)}
          className="font-sans bg-background text-sm"
        />
      </div>
    );
  }
  return null;
}

// ─── Standard Multiple Choice Options ────────────────────────────────────────
export function MultipleChoiceOptions({
  options, correctOption, lang,
  onOptionsChange, onCorrectChange,
}: {
  options: Array<{ id: string; textPt: string; textEn?: string }>;
  correctOption: string;
  lang: "pt" | "en";
  onOptionsChange: (opts: Array<{ id: string; textPt: string; textEn?: string }>) => void;
  onCorrectChange: (v: string) => void;
}) {
  const updateOption = (i: number, field: string, val: string) => {
    const next = [...options];
    next[i] = { ...next[i], [field]: val };
    onOptionsChange(next);
  };

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={opt.id} className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => onCorrectChange(opt.id)}
            className={`text-xs font-bold w-7 h-7 rounded-full border-2 transition-colors shrink-0 ${
              correctOption === opt.id
                ? "bg-green-500/20 border-green-500 text-green-400"
                : "border-border/50 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {opt.id}
          </button>
          <Input
            placeholder={`${lang === "pt" ? "Opção" : "Option"} ${opt.id} PT *`}
            value={opt.textPt}
            onChange={(e) => updateOption(i, "textPt", e.target.value)}
            className="font-sans bg-background text-sm flex-1"
          />
          <Input
            placeholder={`Option ${opt.id} EN`}
            value={opt.textEn || ""}
            onChange={(e) => updateOption(i, "textEn", e.target.value)}
            className="font-sans bg-background text-sm flex-1"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function toRoman(n: number): string {
  const map: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function generateVFCombinations(count: number): string[][] {
  const all: string[][] = [];
  const total = Math.pow(2, count);
  for (let i = 0; i < total && all.length < 5; i++) {
    const combo = Array.from({ length: count }, (_, j) => (i >> (count - 1 - j)) & 1 ? "V" : "F");
    all.push(combo);
  }
  return all;
}
