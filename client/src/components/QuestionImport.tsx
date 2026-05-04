import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType =
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

export interface ParsedMCQuestion {
  textPt: string;
  textEn?: string;
  disciplineId: number;
  subjectId?: number;
  subjectTag?: string;
  author?: string;
  year?: number;
  difficulty: "easy" | "medium" | "hard";
  questionType: QuestionType;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  optE: string;
  correctOption: string;
  explanationPt?: string;
  assertion1?: string;
  assertion2?: string;
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

interface ParsedDiscursiveQuestion {
  textPt: string;
  textEn?: string;
  disciplineId: number;
  subjectId?: number;
  subjectTag?: string;
  author?: string;
  year?: number;
  difficulty: "easy" | "medium" | "hard";
  expectedAnswerPt: string;
  expectedAnswerEn?: string;
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];
const VALID_CORRECT_OPTIONS = ["A", "B", "C", "D", "E"];
const VALID_QUESTION_TYPES: string[] = [
  "multiple_choice",
  "assertion_reason",
  "complex_multiple_choice",
  "matching",
  "true_false",
  "ordering",
  "cloze",
  "clinical_case",
  "image_analysis",
  "interpretation",
  "discursive",
];

function validateMCRow(row: Record<string, unknown>, index: number): ParsedMCQuestion {
  const errors: string[] = [];

  const textPt = String(row.textPt ?? row.text_pt ?? row.enunciado ?? "").trim();
  if (!textPt) errors.push("textPt é obrigatório");

  const disciplineId = Number(row.disciplineId ?? row.discipline_id ?? 0);
  if (!disciplineId) errors.push("disciplineId é obrigatório e deve ser número");

  const difficulty = String(row.difficulty ?? row.dificuldade ?? "medium").toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) errors.push(`difficulty inválido: ${difficulty}`);

  const questionType = String(row.questionType ?? row.question_type ?? "multiple_choice").toLowerCase();
  if (!VALID_QUESTION_TYPES.includes(questionType)) errors.push(`questionType inválido: ${questionType}`);

  const optA = String(row.optA ?? row.opt_a ?? row.alternativaA ?? "").trim();
  const optB = String(row.optB ?? row.opt_b ?? row.alternativaB ?? "").trim();
  const optC = String(row.optC ?? row.opt_c ?? row.alternativaC ?? "").trim();
  const optD = String(row.optD ?? row.opt_d ?? row.alternativaD ?? "").trim();
  const optE = String(row.optE ?? row.opt_e ?? row.alternativaE ?? "").trim();
  if (!optA || !optB || !optC || !optD || !optE) errors.push("Todas as alternativas (A-E) são obrigatórias");

  const correctOption = String(row.correctOption ?? row.correct_option ?? row.gabarito ?? "").toUpperCase().trim();
  if (!VALID_CORRECT_OPTIONS.includes(correctOption)) errors.push(`correctOption inválido: ${correctOption}`);

  return {
    textPt,
    textEn: row.textEn ? String(row.textEn) : undefined,
    disciplineId,
    subjectId: row.subjectId ? Number(row.subjectId) : undefined,
    subjectTag: row.subjectTag ? String(row.subjectTag) : undefined,
    author: row.author ?? row.autor ? String(row.author ?? row.autor) : undefined,
    year: row.year ?? row.ano ? Number(row.year ?? row.ano) : undefined,
    difficulty: difficulty as "easy" | "medium" | "hard",
    questionType: questionType as QuestionType,
    optA,
    optB,
    optC,
    optD,
    optE,
    correctOption,
    explanationPt: row.explanationPt ? String(row.explanationPt) : undefined,
    assertion1: row.assertion1 ? String(row.assertion1) : undefined,
    assertion2: row.assertion2 ? String(row.assertion2) : undefined,
    _rowIndex: index + 1,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

function validateDiscursiveRow(row: Record<string, unknown>, index: number): ParsedDiscursiveQuestion {
  const errors: string[] = [];

  const textPt = String(row.textPt ?? row.text_pt ?? row.enunciado ?? "").trim();
  if (!textPt) errors.push("textPt é obrigatório");

  const disciplineId = Number(row.disciplineId ?? row.discipline_id ?? 0);
  if (!disciplineId) errors.push("disciplineId é obrigatório e deve ser número");

  const difficulty = String(row.difficulty ?? row.dificuldade ?? "medium").toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) errors.push(`difficulty inválido: ${difficulty}`);

  const expectedAnswerPt = String(row.expectedAnswerPt ?? row.expected_answer_pt ?? row.resposta ?? "").trim();
  if (!expectedAnswerPt) errors.push("expectedAnswerPt é obrigatório");

  return {
    textPt,
    textEn: row.textEn ? String(row.textEn) : undefined,
    disciplineId,
    subjectId: row.subjectId ? Number(row.subjectId) : undefined,
    subjectTag: row.subjectTag ? String(row.subjectTag) : undefined,
    author: row.author ?? row.autor ? String(row.author ?? row.autor) : undefined,
    year: row.year ?? row.ano ? Number(row.year ?? row.ano) : undefined,
    difficulty: difficulty as "easy" | "medium" | "hard",
    expectedAnswerPt,
    expectedAnswerEn: row.expectedAnswerEn ? String(row.expectedAnswerEn) : undefined,
    _rowIndex: index + 1,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

// ─── Template generators ──────────────────────────────────────────────────────
function downloadMCTemplate(format: "csv" | "xlsx") {
  const headers = [
    "textPt", "textEn", "disciplineId", "subjectId", "subjectTag", "author", "year",
    "difficulty", "questionType", "optA", "optB", "optC", "optD", "optE",
    "correctOption", "explanationPt", "assertion1", "assertion2",
  ];
  const example = [
    "Qual é a função do fígado na digestão?",
    "What is the liver's role in digestion?",
    "1", "2", "Digestão", "Prof. Silva", "2023",
    "medium", "multiple_choice",
    "Produção de bile", "Absorção de nutrientes", "Filtração do sangue",
    "Produção de insulina", "Armazenamento de glicogênio",
    "A", "O fígado produz bile que emulsifica gorduras.", "", "",
  ];

  if (format === "csv") {
    const csv = [headers.join(","), example.map(v => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_questoes_alternativas.csv";
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questões");
    XLSX.writeFile(wb, "template_questoes_alternativas.xlsx");
  }
}

function downloadDiscursiveTemplate(format: "csv" | "xlsx") {
  const headers = [
    "textPt", "textEn", "disciplineId", "subjectId", "subjectTag", "author", "year",
    "difficulty", "expectedAnswerPt", "expectedAnswerEn",
  ];
  const example = [
    "Descreva o mecanismo de ação da insulina.",
    "Describe the mechanism of action of insulin.",
    "1", "3", "Endocrinologia", "Prof. Santos", "2023",
    "hard",
    "A insulina se liga ao receptor tirosina quinase, ativando a cascata de sinalização que promove a captação de glicose pelas células.",
    "Insulin binds to tyrosine kinase receptor, activating the signaling cascade that promotes glucose uptake by cells.",
  ];

  if (format === "csv") {
    const csv = [headers.join(","), example.map(v => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_questoes_discursivas.csv";
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Discursivas");
    XLSX.writeFile(wb, "template_questoes_discursivas.xlsx");
  }
}

// ─── Template download section ────────────────────────────────────────────────
function TemplateDownloadSection({ type }: { type: "multiple_choice" | "discursive" }) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Templates disponíveis</p>
            <p className="text-xs text-muted-foreground mb-3">
              Baixe o template no formato desejado, preencha com suas questões e faça o upload acima.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => type === "multiple_choice" ? downloadMCTemplate("csv") : downloadDiscursiveTemplate("csv")}
              >
                <Download className="h-3 w-3 mr-1" />
                Template CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => type === "multiple_choice" ? downloadMCTemplate("xlsx") : downloadDiscursiveTemplate("xlsx")}
              >
                <Download className="h-3 w-3 mr-1" />
                Template XLSX
              </Button>
            </div>

            {type === "multiple_choice" && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Campos obrigatórios:</p>
                <p><code className="bg-muted px-1 rounded">textPt</code> — Enunciado em português</p>
                <p><code className="bg-muted px-1 rounded">disciplineId</code> — ID da disciplina (número)</p>
                <p><code className="bg-muted px-1 rounded">difficulty</code> — easy | medium | hard</p>
                <p><code className="bg-muted px-1 rounded">optA</code> a <code className="bg-muted px-1 rounded">optE</code> — Texto de cada alternativa</p>
                <p><code className="bg-muted px-1 rounded">correctOption</code> — A | B | C | D | E</p>
                <p className="font-medium text-foreground mt-2">Campos opcionais:</p>
                <p>
                  <code className="bg-muted px-1 rounded">questionType</code> — multiple_choice | assertion_reason |
                  complex_multiple_choice | matching | true_false | ordering | cloze | clinical_case |
                  image_analysis | interpretation (padrão: multiple_choice)
                </p>
                <p>
                  <code className="bg-muted px-1 rounded">subjectId</code>,{" "}
                  <code className="bg-muted px-1 rounded">subjectTag</code>,{" "}
                  <code className="bg-muted px-1 rounded">author</code>,{" "}
                  <code className="bg-muted px-1 rounded">year</code>,{" "}
                  <code className="bg-muted px-1 rounded">explanationPt</code>,{" "}
                  <code className="bg-muted px-1 rounded">assertion1</code>,{" "}
                  <code className="bg-muted px-1 rounded">assertion2</code>
                </p>
              </div>
            )}

            {type === "discursive" && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Campos obrigatórios:</p>
                <p><code className="bg-muted px-1 rounded">textPt</code> — Enunciado em português</p>
                <p><code className="bg-muted px-1 rounded">disciplineId</code> — ID da disciplina (número)</p>
                <p><code className="bg-muted px-1 rounded">difficulty</code> — easy | medium | hard</p>
                <p><code className="bg-muted px-1 rounded">expectedAnswerPt</code> — Resposta esperada em português</p>
                <p className="font-medium text-foreground mt-2">Campos opcionais:</p>
                <p>
                  <code className="bg-muted px-1 rounded">subjectId</code>,{" "}
                  <code className="bg-muted px-1 rounded">subjectTag</code>,{" "}
                  <code className="bg-muted px-1 rounded">author</code>,{" "}
                  <code className="bg-muted px-1 rounded">year</code>,{" "}
                  <code className="bg-muted px-1 rounded">textEn</code>,{" "}
                  <code className="bg-muted px-1 rounded">expectedAnswerEn</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface QuestionImportProps {
  onImportComplete?: (count: number) => void;
  /** Pre-loaded rows from AI extraction — shown immediately in preview */
  preloadedRows?: ParsedMCQuestion[];
}

export function QuestionImport({ onImportComplete, preloadedRows }: QuestionImportProps) {
  const [importType, setImportType] = useState<"multiple_choice" | "discursive">("multiple_choice");
  const [mcRows, setMcRows] = useState<ParsedMCQuestion[]>(preloadedRows ?? []);
  const [discRows, setDiscRows] = useState<ParsedDiscursiveQuestion[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState((preloadedRows?.length ?? 0) > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When parent passes new pre-loaded rows, load them into preview
  useEffect(() => {
    if (preloadedRows && preloadedRows.length > 0) {
      setMcRows(preloadedRows);
      setImportType("multiple_choice");
      setShowPreview(true);
    }
  }, [preloadedRows]);

  const bulkImport = trpc.questions.bulkImport.useMutation();
  const utils = trpc.useUtils();

  // ── Parse file ──────────────────────────────────────────────────────────────
  const processRows = useCallback((rawRows: Record<string, unknown>[]) => {
    if (importType === "multiple_choice") {
      const parsed = rawRows.map((r, i) => validateMCRow(r, i));
      setMcRows(parsed);
    } else {
      const parsed = rawRows.map((r, i) => validateDiscursiveRow(r, i));
      setDiscRows(parsed);
    }
    setShowPreview(true);
  }, [importType]);

  const parseFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processRows(results.data as Record<string, unknown>[]),
        error: (err: { message: string }) => toast.error(`Erro ao ler CSV: ${err.message}`),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
          processRows(rows);
        } catch (err: unknown) {
          toast.error(`Erro ao ler XLSX: ${(err as Error).message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as unknown;
          const rows = Array.isArray(data) ? data : (data as Record<string, unknown[]>).questions ?? [];
          processRows(rows as Record<string, unknown>[]);
        } catch (err: unknown) {
          toast.error(`Erro ao ler JSON: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Formato não suportado. Use CSV, XLSX ou JSON");
    }
  }, [processRows]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setIsImporting(true);
    try {
      if (importType === "multiple_choice") {
        const valid = mcRows.filter(r => r._valid);
        if (valid.length === 0) {
          toast.error("Nenhuma questão válida. Corrija os erros antes de importar");
          return;
        }
        const payload = valid.map(r => ({
          textPt: r.textPt,
          textEn: r.textEn,
          disciplineId: r.disciplineId,
          subjectId: r.subjectId,
          subjectTag: r.subjectTag,
          author: r.author,
          year: r.year,
          difficulty: r.difficulty,
          questionType: r.questionType,
          options: [
            { id: "A", textPt: r.optA, textEn: "" },
            { id: "B", textPt: r.optB, textEn: "" },
            { id: "C", textPt: r.optC, textEn: "" },
            { id: "D", textPt: r.optD, textEn: "" },
            { id: "E", textPt: r.optE, textEn: "" },
          ],
          correctOption: r.correctOption,
          explanationPt: r.explanationPt,
          assertion1: r.assertion1,
          assertion2: r.assertion2,
        }));
        const result = await bulkImport.mutateAsync({ questions: payload });
        toast.success(`${result.imported} questões importadas com sucesso`);
        await utils.questions.list.invalidate();
        onImportComplete?.(result.imported);
        setMcRows([]);
        setShowPreview(false);
      } else {
        const valid = discRows.filter(r => r._valid);
        toast.success(`${valid.length} questões discursivas prontas para importar`);
      }
    } catch (err: unknown) {
      toast.error(`Erro na importação: ${(err as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const rows = importType === "multiple_choice" ? mcRows : discRows;
  const validCount = rows.filter(r => r._valid).length;
  const errorCount = rows.filter(r => !r._valid).length;

  return (
    <div className="space-y-6">
      {/* Import type selector */}
      <Tabs
        value={importType}
        onValueChange={(v) => {
          setImportType(v as "multiple_choice" | "discursive");
          setMcRows([]);
          setDiscRows([]);
          setShowPreview(false);
        }}
      >
        <TabsList>
          <TabsTrigger value="multiple_choice">Questões de Alternativas</TabsTrigger>
          <TabsTrigger value="discursive">Questões Discursivas</TabsTrigger>
        </TabsList>

        <TabsContent value="multiple_choice" className="space-y-4">
          <TemplateDownloadSection type="multiple_choice" />
        </TabsContent>
        <TabsContent value="discursive" className="space-y-4">
          <TemplateDownloadSection type="discursive" />
        </TabsContent>
      </Tabs>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">Suporta CSV, XLSX e JSON</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Preview */}
      {showPreview && rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização — {rows.length} linhas
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} válidas
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {errorCount} com erro
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {errorCount > 0 && (
              <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  {errorCount} linha(s) com erros serão ignoradas na importação. Corrija o arquivo e reenvie para importar todas.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto max-h-96">
              {importType === "multiple_choice" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enunciado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dificuldade</TableHead>
                      <TableHead>Gabarito</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mcRows.map((row) => (
                      <TableRow key={row._rowIndex} className={row._valid ? "" : "bg-red-500/5"}>
                        <TableCell className="text-muted-foreground">{row._rowIndex}</TableCell>
                        <TableCell>
                          {row._valid
                            ? <CheckCircle className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{row.textPt || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.questionType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.difficulty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs">{row.correctOption}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-red-500 max-w-xs">
                          {row._errors.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enunciado</TableHead>
                      <TableHead>Dificuldade</TableHead>
                      <TableHead>Resposta esperada</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discRows.map((row) => (
                      <TableRow key={row._rowIndex} className={row._valid ? "" : "bg-red-500/5"}>
                        <TableCell className="text-muted-foreground">{row._rowIndex}</TableCell>
                        <TableCell>
                          {row._valid
                            ? <CheckCircle className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{row.textPt || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{row.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {row.expectedAnswerPt || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-red-500 max-w-xs">
                          {row._errors.join("; ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => { setMcRows([]); setDiscRows([]); setShowPreview(false); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isImporting ? "Importando..." : `Importar ${validCount} questão(ões) válida(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
