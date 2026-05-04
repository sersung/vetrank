/**
 * QuestionRenderer.tsx
 * Universal student-facing question display component.
 * Handles all 11 question formats: multiple_choice, assertion_reason,
 * complex_multiple_choice, matching, true_false, ordering, cloze,
 * clinical_case, image_analysis, interpretation, discursive.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSERTION_REASON_OPTIONS, type QuestionType } from "@/components/QuestionFormats";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  id: string;
  textPt: string;
  textEn?: string;
}

export interface QuestionData {
  id: number;
  textPt: string;
  textEn?: string;
  questionType?: QuestionType | string;
  options: QuestionOption[];
  correctOption: string;
  explanationPt?: string;
  explanationEn?: string;
  assertion1?: string;
  assertion2?: string;
  formatData?: any; // JSON blob from DB
  imageUrl?: string;
  difficulty?: string;
  disciplineName?: string;
  subjectTag?: string;
  author?: string;
  year?: number;
}

interface QuestionRendererProps {
  question: QuestionData;
  selectedOption?: string | null;
  answered?: boolean;
  onAnswer?: (optionId: string) => void;
  language?: "pt" | "en";
  showExplanation?: boolean;
  /** If true, show the correct answer highlight even before user answers */
  revealAnswer?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestionRenderer({
  question,
  selectedOption,
  answered = false,
  onAnswer,
  language = "pt",
  showExplanation = false,
  revealAnswer = false,
}: QuestionRendererProps) {
  const qType = (question.questionType || "multiple_choice") as QuestionType;
  const fd = question.formatData || {};
  const lang = language;

  // Defensive normalization: DB may store options as {label, textPt} instead of {id, textPt}
  const normalizedOptions: QuestionOption[] = (question.options || []).map((opt: any) => ({
    id: opt.id ?? opt.label ?? String(opt),
    textPt: opt.textPt ?? opt.text_pt ?? "",
    textEn: opt.textEn ?? opt.text_en,
  }));
  const opts = normalizedOptions;

  const isCorrect = (optId: string) => optId === question.correctOption;
  const isSelected = (optId: string) => optId === selectedOption;

  const optionClass = (optId: string) => {
    if (!answered && !revealAnswer) {
      return cn(
        "w-full text-left px-4 py-3 rounded-lg border text-sm font-sans transition-all",
        isSelected(optId)
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/50 bg-background hover:border-primary/50 hover:bg-accent/30"
      );
    }
    if (isCorrect(optId)) return "w-full text-left px-4 py-3 rounded-lg border text-sm font-sans border-green-500 bg-green-500/10 text-green-400";
    if (isSelected(optId) && !isCorrect(optId)) return "w-full text-left px-4 py-3 rounded-lg border text-sm font-sans border-red-500 bg-red-500/10 text-red-400";
    return "w-full text-left px-4 py-3 rounded-lg border text-sm font-sans border-border/30 bg-background/50 text-muted-foreground";
  };

  const qText = lang === "pt" ? question.textPt : (question.textEn || question.textPt);

  // ── Render by type ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Meta badges */}
      <div className="flex flex-wrap gap-2">
        {question.disciplineName && (
          <Badge variant="outline" className="text-xs font-sans">{question.disciplineName}</Badge>
        )}
        {question.subjectTag && (
          <Badge variant="secondary" className="text-xs font-sans">{question.subjectTag}</Badge>
        )}
        {question.year && (
          <Badge variant="outline" className="text-xs font-sans">{question.year}</Badge>
        )}
        {question.author && (
          <span className="text-xs text-muted-foreground font-sans">{question.author}</span>
        )}
        <Badge variant="outline" className={cn("text-xs font-sans ml-auto", {
          "border-green-500/50 text-green-400": question.difficulty === "easy",
          "border-yellow-500/50 text-yellow-400": question.difficulty === "medium",
          "border-red-500/50 text-red-400": question.difficulty === "hard",
        })}>
          {question.difficulty === "easy" ? (lang === "pt" ? "Fácil" : "Easy") :
           question.difficulty === "hard" ? (lang === "pt" ? "Difícil" : "Hard") :
           (lang === "pt" ? "Médio" : "Medium")}
        </Badge>
      </div>

      {/* ── Clinical Case: show case data before question text ── */}
      {qType === "clinical_case" && fd.caseText && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs font-sans font-semibold text-amber-400 uppercase tracking-wide mb-2">
            {lang === "pt" ? "Caso Clínico" : "Clinical Case"}
          </p>
          <p className="text-sm font-sans text-foreground/90 whitespace-pre-wrap">{fd.caseText}</p>
          {fd.imageUrl && (
            <img src={fd.imageUrl} alt="Caso clínico" className="mt-3 rounded-lg max-h-64 object-contain" />
          )}
        </div>
      )}

      {/* ── Image Analysis: show image before question text ── */}
      {qType === "image_analysis" && fd.imageUrl && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs font-sans font-semibold text-blue-400 uppercase tracking-wide mb-2">
            {lang === "pt" ? "Analise a imagem abaixo:" : "Analyze the image below:"}
          </p>
          <img src={fd.imageUrl} alt="Questão" className="rounded-lg max-h-72 object-contain mx-auto" />
          {fd.caseText && <p className="text-xs text-muted-foreground font-sans mt-2">{fd.caseText}</p>}
        </div>
      )}

      {/* ── Interpretation: show table/data before question text ── */}
      {qType === "interpretation" && fd.tableData && (
        <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <p className="text-xs font-sans font-semibold text-purple-400 uppercase tracking-wide mb-2">
            {lang === "pt" ? "Dados para análise:" : "Data for analysis:"}
          </p>
          <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap overflow-x-auto">{fd.tableData}</pre>
          {fd.imageUrl && <img src={fd.imageUrl} alt="Dados" className="mt-2 rounded-lg max-h-48 object-contain" />}
        </div>
      )}

      {/* ── Question text ── */}
      <p className="text-base font-sans text-foreground leading-relaxed">{qText}</p>

      {/* ── Assertion-Reason: show propositions ── */}
      {qType === "assertion_reason" && (
        <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          {question.assertion1 && (
            <div>
              <span className="text-xs font-sans font-bold text-primary uppercase mr-2">
                {lang === "pt" ? "Afirmativa I:" : "Statement I:"}
              </span>
              <span className="text-sm font-sans">{question.assertion1}</span>
            </div>
          )}
          <div className="text-center text-xs font-bold text-muted-foreground py-1">
            {lang === "pt" ? "PORQUE" : "BECAUSE"}
          </div>
          {question.assertion2 && (
            <div>
              <span className="text-xs font-sans font-bold text-primary uppercase mr-2">
                {lang === "pt" ? "Afirmativa II:" : "Statement II:"}
              </span>
              <span className="text-sm font-sans">{question.assertion2}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Complex Multiple Choice: show items I, II, III ── */}
      {qType === "complex_multiple_choice" && fd.items?.length > 0 && (
        <div className="space-y-2 p-3 bg-accent/20 border border-border/30 rounded-lg">
          {fd.items.map((item: any) => (
            <div key={item.id} className="flex gap-2">
              <span className="text-xs font-bold text-primary w-8 shrink-0">{item.id}.</span>
              <span className="text-sm font-sans">{lang === "pt" ? item.textPt : (item.textEn || item.textPt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Matching: show two-column table ── */}
      {qType === "matching" && fd.pairs?.length > 0 && (
        <div className="p-3 bg-accent/20 border border-border/30 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-xs font-sans font-semibold text-muted-foreground uppercase mb-1">
              {lang === "pt" ? "Coluna A" : "Column A"}
            </div>
            <div className="text-xs font-sans font-semibold text-muted-foreground uppercase mb-1">
              {lang === "pt" ? "Coluna B" : "Column B"}
            </div>
            {fd.pairs.map((pair: any, i: number) => (
              <>
                <div key={`a-${i}`} className="text-sm font-sans p-2 bg-background rounded border border-border/30">
                  <span className="text-xs font-bold text-primary mr-2">{i + 1}.</span>{pair.colA}
                </div>
                <div key={`b-${i}`} className="text-sm font-sans p-2 bg-background rounded border border-border/30">
                  {pair.colB}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* ── True/False: show statements ── */}
      {qType === "true_false" && fd.statements?.length > 0 && (
        <div className="space-y-2 p-3 bg-accent/20 border border-border/30 rounded-lg">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lang === "pt" ? "Julgue as afirmações abaixo:" : "Judge the statements below:"}
          </p>
          {fd.statements.map((s: any) => (
            <div key={s.id} className="flex gap-2">
              <span className="text-xs font-bold text-primary w-8 shrink-0">{s.id}.</span>
              <span className="text-sm font-sans">{lang === "pt" ? s.textPt : (s.textEn || s.textPt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Ordering: show steps to be ordered ── */}
      {qType === "ordering" && fd.steps?.length > 0 && (
        <div className="space-y-2 p-3 bg-accent/20 border border-border/30 rounded-lg">
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lang === "pt" ? "Etapas (em ordem embaralhada):" : "Steps (shuffled):"}
          </p>
          {[...fd.steps].sort(() => 0.5 - Math.random()).map((step: any, i: number) => (
            <div key={step.id} className="flex gap-2 items-center p-2 bg-background rounded border border-border/30">
              <span className="text-xs font-bold text-muted-foreground w-5">{String.fromCharCode(65 + i)}.</span>
              <span className="text-sm font-sans">{lang === "pt" ? step.textPt : (step.textEn || step.textPt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Cloze: highlight [BLANK] in question text ── */}
      {qType === "cloze" && (
        <div className="p-3 bg-accent/20 border border-border/30 rounded-lg">
          <p className="text-xs font-sans text-muted-foreground mb-2">
            {lang === "pt" ? "Preencha as lacunas com a alternativa correta:" : "Fill in the blanks with the correct option:"}
          </p>
          <p className="text-sm font-sans">
            {qText.split("[BLANK]").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className={cn(
                    "inline-block min-w-16 mx-1 px-2 py-0.5 rounded border text-center",
                    answered || revealAnswer ? "border-green-500 bg-green-500/10 text-green-400" : "border-primary/50 bg-primary/5 text-primary"
                  )}>
                    {answered || revealAnswer ? "___" : "___"}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── Discursive: no options, just a text area hint ── */}
      {qType === "discursive" && (
        <div className="p-4 bg-accent/20 border border-border/30 rounded-lg">
          <p className="text-xs font-sans text-muted-foreground italic">
            {lang === "pt" ? "Questão discursiva — resposta aberta." : "Discursive question — open answer."}
          </p>
          {(answered || revealAnswer) && question.explanationPt && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-xs font-sans font-semibold text-primary mb-1">
                {lang === "pt" ? "Resposta esperada:" : "Expected answer:"}
              </p>
              <p className="text-sm font-sans text-foreground/90">{lang === "pt" ? question.explanationPt : (question.explanationEn || question.explanationPt)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Options (for all types with selectable alternatives) ── */}
      {qType !== "discursive" && opts.length > 0 && (
        <div className="space-y-2">
          {opts.map((opt) => (
            <button
              key={opt.id}
              className={optionClass(opt.id)}
              onClick={() => !answered && onAnswer?.(opt.id)}
              disabled={answered}
            >
              <span className="font-bold mr-3 text-xs">{opt.id})</span>
              {lang === "pt" ? opt.textPt : (opt.textEn || opt.textPt)}
              {(answered || revealAnswer) && isCorrect(opt.id) && (
                <span className="ml-2 text-green-400 text-xs">✓</span>
              )}
              {answered && isSelected(opt.id) && !isCorrect(opt.id) && (
                <span className="ml-2 text-red-400 text-xs">✗</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Explanation ── */}
      {(showExplanation || (answered && question.explanationPt)) && question.explanationPt && qType !== "discursive" && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs font-sans font-semibold text-primary mb-2">
            {lang === "pt" ? "Explicação:" : "Explanation:"}
          </p>
          <p className="text-sm font-sans text-foreground/90">
            {lang === "pt" ? question.explanationPt : (question.explanationEn || question.explanationPt)}
          </p>
        </div>
      )}
    </div>
  );
}
