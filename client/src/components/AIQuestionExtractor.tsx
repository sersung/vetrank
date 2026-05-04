import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Brain,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AIExtractedQuestion {
  textPt: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  optE: string;
  correctOption: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: string;
  disciplineSuggestion: string;
  disciplineId?: number;
  year?: number;
  author?: string;
  explanationPt?: string;
  assertion1?: string;
  assertion2?: string;
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
  _aiExtracted: true;
}

interface AIQuestionExtractorProps {
  onQuestionsExtracted: (questions: AIExtractedQuestion[]) => void;
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls =
    difficulty === "easy"
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : difficulty === "hard"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return (
    <Badge className={`text-xs font-sans border ${cls}`}>{difficulty}</Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AIQuestionExtractor({ onQuestionsExtracted }: AIQuestionExtractorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<AIExtractedQuestion[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractMutation = trpc.validation.extractFromFile.useMutation();

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getMimeType = (file: File): "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/msword" | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (ext === "doc") return "application/msword";
    return null;
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g. "data:application/pdf;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Process file ─────────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const mimeType = getMimeType(file);
    if (!mimeType) {
      toast.error("Formato não suportado. Use PDF (.pdf) ou Word (.docx, .doc)");
      return;
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Limite: ${MAX_SIZE_MB} MB`);
      return;
    }

    setIsExtracting(true);
    setExtractedQuestions([]);
    setFileName(file.name);
    setStatusMessage("Lendo arquivo...");

    try {
      const fileBase64 = await fileToBase64(file);
      setStatusMessage("Extraindo texto do arquivo...");

      const result = await extractMutation.mutateAsync({
        fileBase64,
        mimeType,
        fileName: file.name,
      });

      setStatusMessage(`Encontradas ${result.totalExtracted} questões (${result.validCount} válidas)`);
      setExtractedQuestions(result.questions as AIExtractedQuestion[]);

      if (result.totalExtracted === 0) {
        toast.warning("Nenhuma questão encontrada no arquivo. Verifique se o conteúdo está no formato esperado.");
      } else {
        toast.success(`${result.totalExtracted} questões extraídas — ${result.validCount} válidas`);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Erro desconhecido";
      toast.error(`Erro na extração: ${msg}`);
      setStatusMessage("");
    } finally {
      setIsExtracting(false);
    }
  }, [extractMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Inline edit ──────────────────────────────────────────────────────────────
  const updateQuestion = (index: number, field: keyof AIExtractedQuestion, value: string | number) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[index], [field]: value };
      // Re-validate
      const errors: string[] = [];
      if (!q.textPt?.trim()) errors.push("Enunciado vazio");
      if (!["A", "B", "C", "D", "E"].includes(q.correctOption)) errors.push("Gabarito inválido");
      if (!q.optA?.trim() || !q.optB?.trim() || !q.optC?.trim() || !q.optD?.trim()) errors.push("Alternativas incompletas");
      q._errors = errors;
      q._valid = errors.length === 0;
      updated[index] = q as AIExtractedQuestion;
      return updated;
    });
  };

  const validCount = extractedQuestions.filter(q => q._valid).length;
  const errorCount = extractedQuestions.filter(q => !q._valid).length;

  // ── Send to parent ────────────────────────────────────────────────────────────
  const handleSendToImport = () => {
    const valid = extractedQuestions.filter(q => q._valid);
    if (valid.length === 0) {
      toast.error("Nenhuma questão válida para enviar");
      return;
    }
    onQuestionsExtracted(valid);
    toast.success(`${valid.length} questões enviadas para o painel de importação`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <Brain className="h-6 w-6 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium font-sans">Extração Inteligente via IA</p>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            Faça upload de um arquivo PDF ou Word contendo questões de veterinária. A IA identificará
            automaticamente os enunciados, alternativas, gabaritos, dificuldade e grande área sugerida.
            Após a extração, você poderá revisar e editar antes de importar.
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-sans">PDF (.pdf)</Badge>
            <Badge variant="outline" className="text-xs font-sans">Word (.docx)</Badge>
            <Badge variant="outline" className="text-xs font-sans">Word legado (.doc)</Badge>
            <Badge variant="outline" className="text-xs font-sans">Máx. 10 MB</Badge>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        } ${isExtracting ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isExtracting && fileInputRef.current?.click()}
      >
        {isExtracting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium font-sans">{statusMessage || "Processando..."}</p>
            <p className="text-xs text-muted-foreground font-sans">
              A IA está analisando o arquivo. Isso pode levar alguns segundos.
            </p>
          </div>
        ) : (
          <>
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="text-sm font-medium font-sans">
              {fileName ? `Arquivo: ${fileName}` : "Arraste o PDF ou Word aqui, ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              A IA extrairá as questões automaticamente
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Results */}
      {extractedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Questões Extraídas — {extractedQuestions.length} encontradas
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-600/20 text-green-400 border border-green-600/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} válidas
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {errorCount} com erro
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorCount > 0 && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-sm">
                  {errorCount} questão(ões) com erros serão ignoradas. Edite os campos abaixo para corrigir.
                </AlertDescription>
              </Alert>
            )}

            {/* Question list */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {extractedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 transition-colors ${
                    q._valid ? "border-border/50 bg-card" : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  {/* Row header */}
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground font-sans mt-0.5 w-5 shrink-0">
                      {q._rowIndex}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans line-clamp-2">{q.textPt || "— enunciado vazio —"}</p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge className="text-xs font-sans bg-primary/10 text-primary border border-primary/20">
                          <Sparkles className="h-2.5 w-2.5 mr-1" />
                          IA
                        </Badge>
                        <DifficultyBadge difficulty={q.difficulty} />
                        <Badge variant="outline" className="text-xs font-sans">{q.questionType}</Badge>
                        {q.disciplineSuggestion && (
                          <Badge variant="outline" className="text-xs font-sans text-cyan-400 border-cyan-500/30">
                            {q.disciplineSuggestion}
                          </Badge>
                        )}
                        {q.correctOption && (
                          <Badge className="text-xs font-sans">Gabarito: {q.correctOption}</Badge>
                        )}
                        {q._errors.length > 0 && (
                          <span className="text-xs text-red-400 font-sans">{q._errors.join("; ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q._valid
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        {expandedRow === idx
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {expandedRow === idx && (
                    <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Enunciado</label>
                        <textarea
                          className="w-full text-sm font-sans bg-background border border-border rounded-lg p-2 resize-none h-24 focus:outline-none focus:ring-1 focus:ring-primary"
                          value={q.textPt}
                          onChange={(e) => updateQuestion(idx, "textPt", e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(["optA", "optB", "optC", "optD", "optE"] as const).map((opt, oi) => (
                          <div key={opt}>
                            <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">
                              Alternativa {["A", "B", "C", "D", "E"][oi]}
                              {q.correctOption === ["A", "B", "C", "D", "E"][oi] && (
                                <span className="ml-1 text-green-400">(gabarito)</span>
                              )}
                            </label>
                            <Input
                              value={q[opt]}
                              onChange={(e) => updateQuestion(idx, opt, e.target.value)}
                              className="text-sm font-sans bg-background h-8"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Gabarito</label>
                          <select
                            className="w-full text-sm font-sans bg-background border border-border rounded-lg px-2 h-8 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={q.correctOption}
                            onChange={(e) => updateQuestion(idx, "correctOption", e.target.value)}
                          >
                            {["A", "B", "C", "D", "E"].map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Dificuldade</label>
                          <select
                            className="w-full text-sm font-sans bg-background border border-border rounded-lg px-2 h-8 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={q.difficulty}
                            onChange={(e) => updateQuestion(idx, "difficulty", e.target.value as "easy" | "medium" | "hard")}
                          >
                            <option value="easy">Fácil</option>
                            <option value="medium">Médio</option>
                            <option value="hard">Difícil</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Grande Área sugerida</label>
                          <Input
                            value={q.disciplineSuggestion}
                            onChange={(e) => updateQuestion(idx, "disciplineSuggestion", e.target.value)}
                            className="text-sm font-sans bg-background h-8"
                            placeholder="Ex: Ciências Biológicas e Ciclo Básico"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Autor / Banca</label>
                          <Input
                            value={q.author ?? ""}
                            onChange={(e) => updateQuestion(idx, "author", e.target.value)}
                            className="text-sm font-sans bg-background h-8"
                            placeholder="Ex: CFMV 2023"
                          />
                        </div>
                      </div>

                      {q.explanationPt && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground font-sans block mb-1">Explicação</label>
                          <textarea
                            className="w-full text-sm font-sans bg-background border border-border rounded-lg p-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={q.explanationPt}
                            onChange={(e) => updateQuestion(idx, "explanationPt", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="font-sans"
                onClick={() => {
                  setExtractedQuestions([]);
                  setFileName("");
                  setStatusMessage("");
                }}
              >
                Limpar
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-sans"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Novo arquivo
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground font-sans gap-1"
                  onClick={handleSendToImport}
                  disabled={validCount === 0}
                >
                  <FileText className="h-4 w-4" />
                  Enviar {validCount} questão(ões) para importação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
