/**
 * ImportGuide.tsx
 * Painel completo de instruções de importação de questões.
 * Exibido dentro da aba Upload / Importação do AdminPanel.
 *
 * Abas: Campos | JSON | CSV | XLSX | Prompt IA
 */
import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FIELD_REGISTRY,
  FORMAT_SPECS,
  TEMPLATE_JSON,
  TEMPLATE_CSV_HEADER,
  TEMPLATE_CSV_ROWS,
  CATEGORY_LABELS,
  buildAiPrompt,
  type FieldCategory,
} from "@shared/importGuide";
import { MODEL_OPTIONS } from "@shared/questionModels";
import {
  Download, Copy, CheckCheck, AlertCircle, Info, FileJson,
  FileSpreadsheet, FileText, Bot, BookOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string, label = "Copiado!") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Field Table ──────────────────────────────────────────────────────────────

function FieldTable({ category }: { category?: FieldCategory }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const fields = category
    ? FIELD_REGISTRY.filter(f => f.categoria === category)
    : FIELD_REGISTRY;

  const grouped = fields.reduce<Record<string, typeof fields>>((acc, f) => {
    const cat = f.categoria;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            {CATEGORY_LABELS[cat as FieldCategory] ?? cat}
          </h3>
          <div className="space-y-1">
            {items.map((f) => (
              <div key={f.campo} className="rounded-lg border border-border/40 overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setExpanded(expanded === f.campo ? null : f.campo)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <code className="text-xs font-mono text-primary">{f.campo}</code>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono">{f.tipo}</Badge>
                      {f.obrigatorio
                        ? <Badge className="text-[10px] h-4 px-1 bg-red-500/20 text-red-400 border-red-500/30">obrigatório</Badge>
                        : <Badge className="text-[10px] h-4 px-1 bg-muted/40 text-muted-foreground">opcional</Badge>
                      }
                      {!category && (
                        <Badge className="text-[10px] h-4 px-1 bg-muted/20 text-muted-foreground border-border/40">
                          {CATEGORY_LABELS[f.categoria] ?? f.categoria}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.descricao}</p>
                  </div>
                  {expanded === f.campo ? <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />}
                </button>

                {expanded === f.campo && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3 bg-muted/10">
                    <p className="text-sm">{f.descricao}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Exemplo: </span>
                        <code className="text-emerald-400">{f.exemplo}</code>
                      </div>
                      {f.aliasCSV?.length && (
                        <div>
                          <span className="text-muted-foreground">Aliases CSV: </span>
                          <code className="text-blue-400">{f.aliasCSV.join(", ")}</code>
                        </div>
                      )}
                    </div>
                    {f.validacao && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-400">
                        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{f.validacao}</span>
                      </div>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {f.formatosSuportados.map(fmt => (
                        <Badge key={fmt} variant="outline" className="text-[10px] h-4 px-1">{fmt.toUpperCase()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Format Tab ───────────────────────────────────────────────────────────────

function FormatTab({ specId }: { specId: "json" | "csv" | "xlsx" }) {
  const spec = FORMAT_SPECS.find(s => s.id === specId)!;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    copyToClipboard(spec.estruturaExemplo, "Exemplo copiado!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTemplate = () => {
    if (specId === "json") {
      downloadFile(
        JSON.stringify(TEMPLATE_JSON, null, 2),
        "template_questoes.json",
        "application/json"
      );
    } else if (specId === "csv") {
      const content = [TEMPLATE_CSV_HEADER, ...TEMPLATE_CSV_ROWS].join("\n");
      downloadFile(content, "template_questoes.csv", "text/csv;charset=utf-8");
    } else {
      toast.info("Template XLSX disponível na aba de Importação → botão Download Template.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{spec.descricao}</p>
        <Button size="sm" variant="outline" className="shrink-0 gap-1 h-8 text-xs" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5" /> Template
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Vantagens</h4>
          <ul className="space-y-1">
            {spec.vantagens.map((v, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 mt-0.5">✓</span> {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Limitações</h4>
          <ul className="space-y-1">
            {spec.limites.map((l, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estrutura esperada</h4>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/20 rounded-lg p-3 border border-border/30">
          {spec.estrutura}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplo</h4>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={copy}>
            {copied ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <pre className="text-xs font-mono bg-[#0d1a0d] text-emerald-300 rounded-lg p-3 border border-emerald-900/40 overflow-x-auto whitespace-pre-wrap">
          {spec.estruturaExemplo}
        </pre>
      </div>
    </div>
  );
}

// ─── AI Prompt Builder ────────────────────────────────────────────────────────

function AiPromptBuilder() {
  const [opts, setOpts] = useState({
    modelId: "", discipline: "", subject: "", difficulty: "",
    nivelCognitivo: "", banca: "", quantidade: "1", instrucaoExtra: "",
  });
  const [copied, setCopied] = useState(false);

  const prompt = buildAiPrompt({
    modelId: opts.modelId || undefined,
    discipline: opts.discipline || undefined,
    subject: opts.subject || undefined,
    difficulty: opts.difficulty || undefined,
    nivelCognitivo: opts.nivelCognitivo || undefined,
    banca: opts.banca || undefined,
    quantidade: parseInt(opts.quantidade) || 1,
    instrucaoExtra: opts.instrucaoExtra || undefined,
  });

  const copy = () => {
    copyToClipboard(prompt, "Prompt copiado para a área de transferência!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const set = (k: string, v: string) => setOpts(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Configure os parâmetros e copie o prompt gerado para usar com ChatGPT, Claude, Gemini ou qualquer LLM.
        O prompt inclui todas as definições de campos e regras de qualidade do VetRank.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Modelo de Item</label>
          <Select value={opts.modelId || "__all__"} onValueChange={v => set("modelId", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Qualquer modelo</SelectItem>
              {MODEL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.value} — {m.label.split("—")[1]?.trim()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Dificuldade</label>
          <Select value={opts.difficulty || "__all__"} onValueChange={v => set("difficulty", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Qualquer</SelectItem>
              <SelectItem value="very_easy">Muito Fácil</SelectItem>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="hard">Difícil</SelectItem>
              <SelectItem value="very_hard">Muito Difícil</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nível Cognitivo (Bloom)</label>
          <Select value={opts.nivelCognitivo || "__all__"} onValueChange={v => set("nivelCognitivo", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Qualquer</SelectItem>
              <SelectItem value="memorização">Memorização</SelectItem>
              <SelectItem value="compreensão">Compreensão</SelectItem>
              <SelectItem value="aplicação">Aplicação</SelectItem>
              <SelectItem value="análise">Análise</SelectItem>
              <SelectItem value="síntese">Síntese</SelectItem>
              <SelectItem value="avaliação">Avaliação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Disciplina / Área</label>
          <Input value={opts.discipline} onChange={e => set("discipline", e.target.value)} placeholder="ex: Farmacologia" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Assunto específico</label>
          <Input value={opts.subject} onChange={e => set("subject", e.target.value)} placeholder="ex: Anti-helmínticos" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Banca (estilo)</label>
          <Input value={opts.banca} onChange={e => set("banca", e.target.value)} placeholder="ex: CESPE" className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Quantidade</label>
          <Select value={opts.quantidade} onValueChange={v => set("quantidade", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1","2","3","5","10"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <label className="text-xs text-muted-foreground">Instrução adicional</label>
          <Input value={opts.instrucaoExtra} onChange={e => set("instrucaoExtra", e.target.value)}
            placeholder="ex: Foque em questões de concurso público para MAPA de 2022–2024" className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prompt gerado</h4>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={copy}>
            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar prompt"}
          </Button>
        </div>
        <pre className="text-[11px] font-mono bg-[#0a160a] text-green-300/80 rounded-xl p-4 border border-emerald-900/30 overflow-x-auto whitespace-pre-wrap max-h-72">
          {prompt}
        </pre>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ImportGuideProps {
  defaultTab?: string;
}

export function ImportGuide({ defaultTab = "campos" }: ImportGuideProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/10">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Guia de Importação e Referência de Campos</span>
        <Badge variant="outline" className="text-[10px] ml-auto">v1.0</Badge>
      </div>

      <Tabs defaultValue={defaultTab} className="p-4">
        <TabsList className="mb-4 h-8">
          <TabsTrigger value="campos" className="text-xs gap-1 h-7">
            <BookOpen className="h-3 w-3" /> Campos
          </TabsTrigger>
          <TabsTrigger value="json" className="text-xs gap-1 h-7">
            <FileJson className="h-3 w-3" /> JSON
          </TabsTrigger>
          <TabsTrigger value="csv" className="text-xs gap-1 h-7">
            <FileText className="h-3 w-3" /> CSV
          </TabsTrigger>
          <TabsTrigger value="xlsx" className="text-xs gap-1 h-7">
            <FileSpreadsheet className="h-3 w-3" /> XLSX
          </TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs gap-1 h-7">
            <Bot className="h-3 w-3" /> Prompt IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campos" className="mt-0">
          <FieldTable />
        </TabsContent>

        <TabsContent value="json" className="mt-0">
          <FormatTab specId="json" />
        </TabsContent>

        <TabsContent value="csv" className="mt-0">
          <FormatTab specId="csv" />
        </TabsContent>

        <TabsContent value="xlsx" className="mt-0">
          <FormatTab specId="xlsx" />
        </TabsContent>

        <TabsContent value="prompt" className="mt-0">
          <AiPromptBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
