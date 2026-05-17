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
import { MODEL_MAP } from "@shared/questionModels";
import { trpc } from "@/lib/trpc";
import { descricaoGabaritoM5 } from "@/components/QuestionModelForms";

// ─── Responsive image helper ──────────────────────────────────────────────────

/**
 * Renders a responsive <picture> element.
 * New uploads store the _md.webp variant as primary URL.
 * sm (480px) and lg (1440px) variants are inferred by suffix replacement.
 * Legacy single-image URLs (no _md.webp suffix) are served as-is.
 */
function QuestionImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const isVariant = src.includes("_md.webp");
  if (!isVariant) {
    return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
  }
  const sm = src.replace("_md.webp", "_sm.webp");
  const lg = src.replace("_md.webp", "_lg.webp");
  return (
    <picture>
      <source media="(max-width: 480px)"  srcSet={sm} type="image/webp" />
      <source media="(max-width: 960px)"  srcSet={src} type="image/webp" />
      <source media="(min-width: 961px)"  srcSet={lg} type="image/webp" />
      <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
    </picture>
  );
}

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
  modelId?: string;
  options: QuestionOption[];
  correctOption: string;
  explanationPt?: string;
  explanationEn?: string;
  assertion1?: string;
  assertion2?: string;
  // M5 booleanos
  a1Verdadeira?: boolean | null;
  a2Verdadeira?: boolean | null;
  relacaoCausal?: boolean | null;
  // M10
  grupoId?: string | null;
  posicaoBloco?: number | null;
  formatData?: any;
  imageUrl?: string;
  difficulty?: string;
  disciplineName?: string;
  subjectTag?: string;
  author?: string;
  banca?: string;
  year?: number;
  isAnulada?: boolean;
  isDesatualizada?: boolean;
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

// ─── M3: Assertivas sub-renderer ─────────────────────────────────────────────

function AssertiveRenderer({ questionId, fd, answered, lang }: {
  questionId: number; fd: any; answered: boolean; lang: string;
}) {
  const { data: assertivas = [] } = trpc.questions.getAssertivas.useQuery(
    { questionId },
    { staleTime: 60_000 }
  );

  // Fallback: use formatData.items if no relational data
  const items: Array<{ id: string; label: string; textPt: string; correta?: boolean }> =
    assertivas.length > 0
      ? assertivas.map(a => ({ id: a.label, label: a.label, textPt: a.textPt, correta: a.correta }))
      : (fd.items ?? []).map((i: any) => ({ id: i.id, label: i.id, textPt: i.textPt, correta: undefined }));

  if (!items.length) return null;

  return (
    <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-accent/10">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {lang === "pt" ? "Analise as afirmativas:" : "Analyze the statements:"}
      </p>
      {items.map((item) => {
        const showVF = answered && item.correta !== undefined;
        return (
          <div key={item.id} className={cn(
            "flex gap-3 rounded-lg p-2.5 border transition-colors",
            showVF
              ? item.correta
                ? "border-emerald-500/40 bg-emerald-500/8"
                : "border-red-500/40 bg-red-500/8"
              : "border-border/30 bg-background/50"
          )}>
            <span className="text-xs font-black text-primary mt-0.5 w-6 shrink-0">{item.label}.</span>
            <span className="text-sm flex-1">{lang === "pt" ? item.textPt : item.textPt}</span>
            {showVF && (
              <span className={cn(
                "text-xs font-black shrink-0 mt-0.5 px-1.5 py-0.5 rounded",
                item.correta
                  ? "text-emerald-400 bg-emerald-500/20"
                  : "text-red-400 bg-red-500/20"
              )}>
                {item.correta ? "✓ V" : "✗ F"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── M5: Asserção–Razão sub-renderer ─────────────────────────────────────────

function AssertionReasonRenderer({ question, answered, lang }: {
  question: QuestionData; answered: boolean; lang: string;
}) {
  const hasVF = question.a1Verdadeira != null && question.a2Verdadeira != null;
  const a1V = question.a1Verdadeira ?? true;
  const a2V = question.a2Verdadeira ?? true;

  const PropBox = ({ label, text, verdadeira }: { label: string; text?: string; verdadeira: boolean }) => (
    <div className={cn(
      "rounded-xl border p-4 space-y-2 transition-colors",
      answered && hasVF
        ? verdadeira ? "border-emerald-500/40 bg-emerald-500/8" : "border-red-500/40 bg-red-500/8"
        : "border-primary/20 bg-primary/5"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-primary uppercase tracking-wide">{label}</span>
        {answered && hasVF && (
          <span className={cn(
            "text-xs font-black px-2 py-0.5 rounded",
            verdadeira ? "text-emerald-400 bg-emerald-500/20" : "text-red-400 bg-red-500/20"
          )}>
            {verdadeira ? "✓ VERDADEIRA" : "✗ FALSA"}
          </span>
        )}
      </div>
      {text && <p className="text-sm">{text}</p>}
    </div>
  );

  return (
    <div className="space-y-2">
      <PropBox
        label={lang === "pt" ? "Afirmativa I" : "Statement I"}
        text={question.assertion1}
        verdadeira={a1V}
      />
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-xs font-black text-amber-400 tracking-widest px-3 py-1 rounded border border-amber-500/30 bg-amber-500/10">
          {lang === "pt" ? "PORQUE" : "BECAUSE"}
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <PropBox
        label={lang === "pt" ? "Afirmativa II (Razão)" : "Statement II (Reason)"}
        text={question.assertion2}
        verdadeira={a2V}
      />
      {answered && hasVF && question.relacaoCausal != null && a1V && a2V && (
        <div className={cn(
          "text-xs text-center py-2 px-3 rounded-lg border",
          question.relacaoCausal
            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            : "border-red-500/30 text-red-400 bg-red-500/10"
        )}>
          {question.relacaoCausal
            ? (lang === "pt" ? "✓ A Afirmativa II é justificativa correta da I" : "✓ Statement II correctly justifies Statement I")
            : (lang === "pt" ? "✗ A Afirmativa II NÃO é justificativa correta da I" : "✗ Statement II does NOT correctly justify Statement I")
          }
        </div>
      )}
      {answered && (
        <p className="text-xs text-muted-foreground text-center py-1">
          {descricaoGabaritoM5(question.correctOption)}
        </p>
      )}
    </div>
  );
}

// ─── M8: Matching sub-renderer ────────────────────────────────────────────────

function MatchingRenderer({ questionId, fd, answered, correctOption, opts, lang }: {
  questionId: number; fd: any; answered: boolean;
  correctOption: string; opts: QuestionOption[]; lang: string;
}) {
  const { data: matchingData } = trpc.questions.getMatchingData.useQuery(
    { questionId },
    { staleTime: 60_000 }
  );

  const hasRelational = matchingData && matchingData.esquerda.length > 0;

  if (hasRelational) {
    const { esquerda, direita, pairs } = matchingData;
    const correctPairMap = new Map(pairs.map(p => [p.esquerdaId, p.direitaId]));

    // Figure out which alt was selected/correct to color the pairs
    const correctAltText = opts.find(o => o.id === correctOption)?.textPt ?? "";

    return (
      <div className="rounded-xl border border-border/40 bg-accent/10 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            {lang === "pt" ? "Coluna I" : "Column I"}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            {lang === "pt" ? "Coluna II" : "Column II"}
          </p>
          {esquerda.map((e) => {
            const corrDirId = correctPairMap.get(e.id);
            const corrDir = direita.find(d => d.id === corrDirId);
            return (
              <div key={e.id} className={cn(
                "contents"
              )}>
                <div className={cn(
                  "p-2 rounded-lg border text-sm",
                  answered ? "border-emerald-500/30 bg-emerald-500/8" : "border-border/30 bg-background"
                )}>
                  <span className="text-xs font-bold text-primary mr-1.5">{e.label}.</span>
                  {e.textPt}
                </div>
                <div className={cn(
                  "p-2 rounded-lg border text-sm",
                  answered && corrDir ? "border-emerald-500/30 bg-emerald-500/8" : "border-border/30 bg-background"
                )}>
                  {answered && corrDir ? (
                    <>
                      <span className="text-xs font-bold text-blue-400 mr-1.5">{corrDir.label})</span>
                      {corrDir.textPt}
                      <span className="text-emerald-400 ml-1 text-xs">✓</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {lang === "pt" ? "→ selecione a alternativa" : "→ select the alternative"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {answered && (
          <p className="text-xs text-center text-muted-foreground">
            {lang === "pt" ? "Correspondência correta:" : "Correct match:"} <strong>{correctAltText}</strong>
          </p>
        )}
      </div>
    );
  }

  // Fallback: formatData.pairs
  if (!fd.pairs?.length) return null;
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-accent/10">
      <div className="grid grid-cols-2 gap-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
          {lang === "pt" ? "Coluna A" : "Column A"}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
          {lang === "pt" ? "Coluna B" : "Column B"}
        </p>
        {fd.pairs.map((pair: any, i: number) => (
          <>
            <div key={`a-${i}`} className="text-sm p-2 bg-background rounded border border-border/30">
              <span className="text-xs font-bold text-primary mr-2">{i + 1}.</span>{pair.colA}
            </div>
            <div key={`b-${i}`} className="text-sm p-2 bg-background rounded border border-border/30">
              {pair.colB}
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
        {/* Model badge M1–M10 */}
        {question.modelId && MODEL_MAP[question.modelId as keyof typeof MODEL_MAP] && (
          <Badge className="text-xs font-sans bg-violet-500/20 text-violet-300 border-violet-500/30" title={MODEL_MAP[question.modelId as keyof typeof MODEL_MAP].nome_modelo}>
            {question.modelId}
          </Badge>
        )}
        {question.disciplineName && (
          <Badge variant="outline" className="text-xs font-sans">{question.disciplineName}</Badge>
        )}
        {question.subjectTag && (
          <Badge variant="secondary" className="text-xs font-sans">{question.subjectTag}</Badge>
        )}
        {question.banca && (
          <Badge variant="outline" className="text-xs font-sans border-blue-500/30 text-blue-400">{question.banca}</Badge>
        )}
        {question.year && (
          <Badge variant="outline" className="text-xs font-sans">{question.year}</Badge>
        )}
        {question.author && (
          <span className="text-xs text-muted-foreground font-sans">{question.author}</span>
        )}
        {question.isAnulada && (
          <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">Anulada</Badge>
        )}
        {question.isDesatualizada && (
          <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">Desatualizada</Badge>
        )}
        <Badge variant="outline" className={cn("text-xs font-sans ml-auto", {
          "border-sky-500/50 text-sky-400": question.difficulty === "very_easy",
          "border-green-500/50 text-green-400": question.difficulty === "easy",
          "border-yellow-500/50 text-yellow-400": question.difficulty === "medium",
          "border-red-500/50 text-red-400": question.difficulty === "hard",
          "border-purple-500/50 text-purple-400": question.difficulty === "very_hard",
        })}>
          {question.difficulty === "very_easy" ? "Muito Fácil" :
           question.difficulty === "easy" ? (lang === "pt" ? "Fácil" : "Easy") :
           question.difficulty === "hard" ? (lang === "pt" ? "Difícil" : "Hard") :
           question.difficulty === "very_hard" ? "Muito Difícil" :
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
            <QuestionImage src={fd.imageUrl} alt="Caso clínico" className="mt-3 rounded-lg max-h-64 object-contain" />
          )}
        </div>
      )}

      {/* ── Image Analysis: show image before question text ── */}
      {qType === "image_analysis" && fd.imageUrl && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs font-sans font-semibold text-blue-400 uppercase tracking-wide mb-2">
            {lang === "pt" ? "Analise a imagem abaixo:" : "Analyze the image below:"}
          </p>
          <QuestionImage src={fd.imageUrl} alt="Questão" className="rounded-lg max-h-72 object-contain mx-auto" />
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
          {fd.imageUrl && <QuestionImage src={fd.imageUrl} alt="Dados" className="mt-2 rounded-lg max-h-48 object-contain" />}
        </div>
      )}

      {/* ── Question text ── */}
      <p className="text-base font-sans text-foreground leading-relaxed">{qText}</p>

      {/* ── Question-level image (M1/M2/M3/M4/M6/etc. com imagem no enunciado) ── */}
      {question.imageUrl && !fd.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-border/30 bg-muted/10">
          <QuestionImage
            src={question.imageUrl}
            alt="Imagem da questão"
            className="w-full max-h-80 object-contain"
          />
        </div>
      )}

      {/* ── M5: Asserção–Razão com V/F revelado após resposta ── */}
      {qType === "assertion_reason" && (
        <AssertionReasonRenderer question={question} answered={answered || revealAnswer} lang={lang} />
      )}

      {/* ── M3: Complex Multiple Choice — assertivas com V/F revelado após resposta ── */}
      {qType === "complex_multiple_choice" && (
        <AssertiveRenderer questionId={question.id} fd={fd} answered={answered || revealAnswer} lang={lang} />
      )}

      {/* ── M8: Matching — colunas com pares revelados após resposta ── */}
      {qType === "matching" && (
        <MatchingRenderer questionId={question.id} fd={fd} answered={answered || revealAnswer} correctOption={question.correctOption} opts={opts} lang={lang} />
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
