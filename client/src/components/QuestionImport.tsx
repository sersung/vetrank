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

// --- Types ---
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
  difficulty: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
  questionType: QuestionType;
  modelId?: string;
  banca?: string;
  instituicao?: string;
  cargo?: string;
  carreira?: string;
  areaFormacao?: string;
  escolaridade?: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  optE: string;
  correctOption: string;
  explanationPt?: string;
  assertion1?: string;
  assertion2?: string;
  imageUrl?: string;
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
  imageUrl?: string;
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

// --- Validation ---
const VALID_DIFFICULTIES = ["very_easy", "easy", "medium", "hard", "very_hard"];
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

  const str = (k: string, ...aliases: string[]) => {
    for (const key of [k, ...aliases]) {
      if (row[key]) return String(row[key]).trim();
    }
    return undefined;
  };

  return {
    textPt,
    textEn: str("textEn", "text_en"),
    disciplineId,
    subjectId: row.subjectId ? Number(row.subjectId) : undefined,
    subjectTag: str("subjectTag", "subject_tag", "tag_assunto", "tema"),
    author: str("author", "autor", "elaborador"),
    year: (row.year ?? row.ano) ? Number(row.year ?? row.ano) : undefined,
    difficulty: difficulty as ParsedMCQuestion["difficulty"],
    questionType: questionType as QuestionType,
    modelId: str("modelId", "model_id", "modelo"),
    banca: str("banca", "organizadora"),
    instituicao: str("instituicao", "institution", "universidade"),
    cargo: str("cargo", "position"),
    carreira: str("carreira", "career"),
    areaFormacao: str("areaFormacao", "area_formacao", "area"),
    escolaridade: str("escolaridade", "education_level"),
    optA,
    optB,
    optC,
    optD,
    optE,
    correctOption,
    explanationPt: str("explanationPt", "explicacao", "justificativa"),
    assertion1: str("assertion1", "assercao1"),
    assertion2: str("assertion2", "assercao2"),
    imageUrl: str("imageUrl", "image_url", "imagem"),
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
    imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
    _rowIndex: index + 1,
    _errors: errors,
    _valid: errors.length === 0,
  };
}

// --- Template generators ---
function downloadMCTemplate(format: "csv" | "xlsx") {
  const headers = [
    // Obrigatórios
    "textPt", "disciplineId", "difficulty", "optA", "optB", "optC", "optD", "optE", "correctOption",
    // Classificação / proveniência
    "modelId", "questionType", "banca", "instituicao", "cargo", "carreira", "areaFormacao", "escolaridade", "year", "author",
    // Conteúdo complementar
    "textEn", "subjectId", "subjectTag", "explanationPt", "assertion1", "assertion2", "imageUrl",
  ];

  const example = [
    // Obrigatórios
    "Qual é o principal mecanismo de ação da ivermectina em parasitas?",
    "1",          // disciplineId
    "medium",     // difficulty: very_easy | easy | medium | hard | very_hard
    "Inibe síntese de DNA", "Bloqueia canais de Ca2+", "Potencializa canais de Cl- via glutamato",
    "Inibe síntese proteica", "Bloqueia receptores nicotínicos",
    "C",          // correctOption
    // Classificação
    "M1",                           // modelId: M1–M10
    "multiple_choice",              // questionType
    "CESPE/CEBRASPE",               // banca
    "UnB",                          // instituicao
    "Médico Veterinário",           // cargo
    "Residência Veterinária",       // carreira
    "Medicina Veterinária",         // areaFormacao
    "superior",                     // escolaridade: fundamental | medio | superior
    "2023",                         // year
    "Prof. Silva",                  // author
    // Complementar
    "What is the main mechanism of action of ivermectin?",
    "2",                            // subjectId
    "Farmacologia",                 // subjectTag
    "A ivermectina potencializa canais de Cl- dependentes de glutamato, causando paralisia flácida.",
    "",                             // assertion1 (para M5)
    "",                             // assertion2 (para M5)
    "",                             // imageUrl
  ];

  const download = (content: Blob | null, filename: string) => {
    const blob = content ?? new Blob([], {});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  if (format === "csv") {
    const bom = "﻿"; // UTF-8 BOM para Excel reconhecer acentuação
    const csv = bom + [headers.join(","), example.map(v => `"${v.replace(/"/g, '""')}"`).join(",")].join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "template_questoes_alternativas.csv");
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    // Largura automática das colunas
    ws["!cols"] = headers.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questões MC");
    XLSX.writeFile(wb, "template_questoes_alternativas.xlsx");
  }
}

function downloadDiscursiveTemplate(format: "csv" | "xlsx") {
  const headers = [
    // Obrigatórios
    "textPt", "disciplineId", "difficulty", "expectedAnswerPt",
    // Classificação / proveniência
    "banca", "instituicao", "cargo", "carreira", "areaFormacao", "escolaridade", "year", "author",
    // Complementar
    "textEn", "subjectId", "subjectTag", "expectedAnswerEn", "imageUrl",
  ];

  const example = [
    // Obrigatórios
    "Explique o conceito de refugia e sua importância no controle da resistência anti-helmíntica em bovinos.",
    "1",     // disciplineId
    "hard",  // difficulty: very_easy | easy | medium | hard | very_hard
    "Refugia refere-se à população parasitária não exposta ao anti-helmíntico, que dilui genes de resistência ao se cruzar com os resistentes selecionados. Sua preservação é fundamental para retardar o desenvolvimento de resistência.",
    // Classificação
    "CESPE/CEBRASPE",           // banca
    "UnB",                      // instituicao
    "Médico Veterinário",       // cargo
    "Residência Veterinária",   // carreira
    "Medicina Veterinária",     // areaFormacao
    "superior",                 // escolaridade
    "2023",                     // year
    "Prof. Santos",             // author
    // Complementar
    "Explain the concept of refugia and its importance in controlling anthelmintic resistance in cattle.",
    "1",                        // subjectId
    "Farmacologia — Resistência",
    "Refugia refers to the parasite population not exposed to the anthelmintic, which dilutes resistance genes.",
    "",                         // imageUrl
  ];

  if (format === "csv") {
    const bom = "﻿";
    const csv = bom + [headers.join(","), example.map(v => `"${v.replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = "template_questoes_discursivas.csv"; a.click();
    URL.revokeObjectURL(url);
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 28 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Discursivas");
    XLSX.writeFile(wb, "template_questoes_discursivas.xlsx");
  }
}

// --- Template download section ---
function Field({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono shrink-0">{name}</code>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}

function TemplateDownloadSection({ type }: { type: "multiple_choice" | "discursive" }) {
  const isMC = type === "multiple_choice";
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        {/* Download buttons */}
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Templates para download</p>
            <p className="text-xs text-muted-foreground mb-3">
              Baixe o template, preencha uma questão por linha e faça o upload acima.
              O arquivo deve ter exatamente os mesmos nomes de coluna do template.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm"
                onClick={() => isMC ? downloadMCTemplate("csv") : downloadDiscursiveTemplate("csv")}>
                <Download className="h-3 w-3 mr-1.5" /> Template CSV
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => isMC ? downloadMCTemplate("xlsx") : downloadDiscursiveTemplate("xlsx")}>
                <Download className="h-3 w-3 mr-1.5" /> Template XLSX
              </Button>
            </div>
          </div>
        </div>

        {/* Field reference */}
        <div className="rounded-lg bg-muted/20 border border-border/40 p-4 space-y-4 text-xs">
          {/* Obrigatórios */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
              Campos obrigatórios
            </p>
            <Field name="textPt" desc="Enunciado completo da questão em português." />
            <Field name="disciplineId" desc="ID numérico da Grande Área (consulte a lista de disciplinas no sistema)." />
            <Field name="difficulty" desc="very_easy | easy | medium | hard | very_hard" />
            {isMC ? (
              <>
                <Field name="optA … optE" desc="Texto de cada uma das 5 alternativas (A, B, C, D, E) — todas obrigatórias." />
                <Field name="correctOption" desc="Letra do gabarito: A | B | C | D | E" />
              </>
            ) : (
              <Field name="expectedAnswerPt" desc="Resposta esperada / gabarito comentado em português." />
            )}
          </div>

          {/* Classificação */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
              Classificação e proveniência (opcionais, mas recomendados)
            </p>
            {isMC && (
              <>
                <Field name="modelId" desc="Modelo de item: M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10" />
                <Field name="questionType" desc="multiple_choice | assertion_reason | complex_multiple_choice | matching | true_false | ordering | cloze | clinical_case | image_analysis | interpretation (padrão: multiple_choice)" />
              </>
            )}
            <Field name="banca" desc="Banca examinadora: ex. CESPE/CEBRASPE, VUNESP, FGV, INEP" />
            <Field name="instituicao" desc="Instituição que aplicou a prova: ex. USP, UFMG, CFMV" />
            <Field name="cargo" desc="Cargo ou vaga: ex. Médico Veterinário — Nível Superior" />
            <Field name="carreira" desc="Trilha de estudo: ex. Residência Veterinária, ENADE, Concurso Público" />
            <Field name="areaFormacao" desc="Área de formação: ex. Medicina Veterinária" />
            <Field name="escolaridade" desc="fundamental | medio | superior (padrão: superior)" />
            <Field name="year" desc="Ano da prova em 4 dígitos: ex. 2023" />
            <Field name="author" desc="Autor ou elaborador da questão." />
          </div>

          {/* Conteúdo complementar */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
              Conteúdo complementar (opcionais)
            </p>
            <Field name="subjectId" desc="ID numérico do assunto dentro da grande área." />
            <Field name="subjectTag" desc="Tag de assunto em texto livre: ex. Farmacologia Veterinária" />
            {isMC ? (
              <>
                <Field name="explanationPt" desc="Justificativa do gabarito com análise dos distratores." />
                <Field name="assertion1" desc="[M5] Texto da Asserção I (proposição principal)." />
                <Field name="assertion2" desc="[M5] Texto da Asserção II — razão (conectada pelo PORQUE)." />
              </>
            ) : (
              <Field name="expectedAnswerEn" desc="Resposta esperada em inglês (bilíngue)." />
            )}
            <Field name="textEn" desc="Enunciado em inglês (interface bilíngue)." />
            <Field name="imageUrl" desc="URL pública de imagem para o enunciado (JPEG, PNG ou WebP)." />
          </div>

          {/* Nota premium */}
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-400 text-[11px]">
            ★ Todas as questões importadas são automaticamente marcadas como <strong>Premium</strong> —
            visíveis apenas para assinantes ativos ou em período de trial.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---
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

  // --- Parse file ---
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

  // --- Import ---
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
          // Novos campos de classificação
          banca: r.banca,
          instituicao: r.instituicao,
          cargo: r.cargo,
          carreira: r.carreira,
          areaFormacao: r.areaFormacao,
          escolaridade: r.escolaridade as any,
          // Todas as questões importadas são premium por padrão
          isPremium: true,
          options: [
            { id: "A", textPt: r.optA },
            { id: "B", textPt: r.optB },
            { id: "C", textPt: r.optC },
            { id: "D", textPt: r.optD },
            { id: "E", textPt: r.optE },
          ],
          correctOption: r.correctOption,
          explanationPt: r.explanationPt,
          assertion1: r.assertion1,
          assertion2: r.assertion2,
          imageUrl: r.imageUrl,
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
