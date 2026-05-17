/**
 * QuestionModelForms.tsx
 * Formulários de admin específicos para cada modelo relacional:
 *   M3FormSection  — Assertivas (I/II/III/IV) com V/F + geração automática de alternativas
 *   M5FormSection  — Asserção–Razão com seletores V/F + gabarito automático
 *   M8FormSection  — Colunas de Associação + pares corretos + alternativas automáticas
 *   M10FormSection — Grupo de Alternativas Constantes (texto-base + A-E fixos)
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowUpDown, Link2, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssertivaDraft {
  label: string;   // "I", "II", "III", "IV"
  textPt: string;
  textEn?: string;
  correta: boolean;
}

export interface MatchingColDraft {
  label: string;    // "1","2"... or "a","b"...
  textPt: string;
  textEn?: string;
}

export interface MatchingPairDraft {
  esquerdaOrdem: number;
  direitaOrdem: number;
}

export interface QuestionGroupDraft {
  grupoId: string;
  titulo?: string;
  textBasePt: string;
  textBaseEn?: string;
  alternativas: Record<string, string>; // {A:"...", B:"...", ...}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROMAN = ["I", "II", "III", "IV", "V"];
const ALT_LABELS = ["A", "B", "C", "D", "E"];

/** Gera as 5 alternativas de combinações a partir de quais assertivas são corretas */
function gerarAlternativasM3(assertivas: AssertivaDraft[]): Record<string, string> {
  const corretas = assertivas.filter(a => a.correta).map(a => a.label);
  const incorretas = assertivas.filter(a => !a.correta).map(a => a.label);

  if (corretas.length === 0 || incorretas.length === 0) return {};

  // Gabarito = combinação das corretas
  const gabarito = corretas.length === 1
    ? `Apenas ${corretas[0]}.`
    : corretas.length === assertivas.length
      ? "Todas as afirmativas."
      : `${corretas.slice(0, -1).join(", ")} e ${corretas.at(-1)}.`;

  // Distratores: variações com pelo menos uma errada
  const distratorPool: string[] = [];
  // distrator 1: apenas a primeira assertiva (qualquer uma)
  distratorPool.push(`Apenas ${assertivas[0].label}.`);
  // distrator 2: apenas incorretas
  if (incorretas.length >= 1) {
    const d = incorretas.length === 1 ? `Apenas ${incorretas[0]}.` : `${incorretas[0]} e ${incorretas[1] ?? incorretas[0]}.`;
    distratorPool.push(d);
  }
  // distrator 3: todas menos a última correta
  if (assertivas.length >= 2) {
    const subset = assertivas.slice(0, -1).map(a => a.label);
    distratorPool.push(`${subset.slice(0, -1).join(", ")} e ${subset.at(-1)}.`);
  }
  // distrator 4: primeira + última
  distratorPool.push(`${assertivas[0].label} e ${assertivas.at(-1)?.label}.`);

  // Shuffle gabarito position
  const alts = [gabarito, ...distratorPool.slice(0, 4)];
  // Rotate: put gabarito at position C (index 2)
  const rotated = [...alts.slice(-2), ...alts.slice(0, -2)];
  return Object.fromEntries(ALT_LABELS.map((l, i) => [l, rotated[i] ?? `Alternativa ${l}.`]));
}

/** Gabarito M5 determinado pelos 3 booleanos */
export function gabaritoPorM5Booleans(a1: boolean, a2: boolean, relacao: boolean): string {
  if (a1 && a2 && relacao) return "A";
  if (a1 && a2 && !relacao) return "B";
  if (a1 && !a2) return "C";
  if (!a1 && a2) return "D";
  return "E";
}

/** Texto descritivo do gabarito M5 */
export function descricaoGabaritoM5(gabarito: string): string {
  const map: Record<string, string> = {
    A: "As duas afirmativas são VERDADEIRAS e a II é justificativa CORRETA da I.",
    B: "As duas afirmativas são VERDADEIRAS, mas a II NÃO é justificativa correta da I.",
    C: "A afirmativa I é VERDADEIRA e a afirmativa II é FALSA.",
    D: "A afirmativa I é FALSA e a afirmativa II é VERDADEIRA.",
    E: "As duas afirmativas são FALSAS.",
  };
  return map[gabarito] ?? "";
}

/** Gera alternativas de associação (M8) */
function gerarAlternativasM8(
  esquerda: MatchingColDraft[],
  direita: MatchingColDraft[],
  pairs: MatchingPairDraft[]
): Record<string, string> {
  if (!esquerda.length || !direita.length || !pairs.length) return {};

  const corretaStr = esquerda.map((e, ei) => {
    const pair = pairs.find(p => p.esquerdaOrdem === ei + 1);
    const dir = pair ? direita[pair.direitaOrdem - 1] : null;
    return dir ? `${e.label}-${dir.label}` : "";
  }).filter(Boolean).join(" / ");

  // Distratores: rotacionar as colunas da direita
  const dirLabels = direita.map(d => d.label);
  const rotated1 = [...dirLabels.slice(1), dirLabels[0]];
  const rotated2 = [...dirLabels.slice(2), ...dirLabels.slice(0, 2)];
  const reversed = [...dirLabels].reverse();
  const shuffled = [dirLabels[0], dirLabels[2] ?? dirLabels[0], dirLabels[1] ?? dirLabels[0], ...dirLabels.slice(3)];

  const makeStr = (mapping: string[]) =>
    esquerda.map((e, i) => `${e.label}-${mapping[i] ?? dirLabels[i]}`).join(" / ");

  const alts = [corretaStr, makeStr(rotated1), makeStr(rotated2), makeStr(reversed), makeStr(shuffled)];
  return Object.fromEntries(ALT_LABELS.map((l, i) => [l, alts[i] ?? `Alternativa ${l}.`]));
}

// ─── M3 Form ──────────────────────────────────────────────────────────────────

interface M3FormProps {
  assertivas: AssertivaDraft[];
  onChange: (assertivas: AssertivaDraft[]) => void;
  /** Callback chamado quando as alternativas são geradas automaticamente */
  onAlternativasGeradas?: (alts: Record<string, string>, gabarito: string) => void;
}

export function M3FormSection({ assertivas, onChange, onAlternativasGeradas }: M3FormProps) {
  const addAssertiva = () => {
    if (assertivas.length >= 5) return;
    onChange([...assertivas, { label: ROMAN[assertivas.length], textPt: "", correta: false }]);
  };

  const removeAssertiva = (i: number) => {
    const next = assertivas.filter((_, idx) => idx !== i)
      .map((a, idx) => ({ ...a, label: ROMAN[idx] }));
    onChange(next);
  };

  const update = (i: number, patch: Partial<AssertivaDraft>) => {
    onChange(assertivas.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  };

  const gerarAlts = useCallback(() => {
    const alts = gerarAlternativasM3(assertivas);
    const corretas = assertivas.filter(a => a.correta).map(a => a.label);
    // Gabarito é o índice C (alternativa C = posição 2) após o rotate no gerarAlternativasM3
    // Precisamos determinar qual letra corresponde ao gabarito
    const gabaritoText = corretas.length === 1
      ? `Apenas ${corretas[0]}.`
      : corretas.length === assertivas.length
        ? "Todas as afirmativas."
        : `${corretas.slice(0, -1).join(", ")} e ${corretas.at(-1)}.`;
    const gabaritoLetra = ALT_LABELS.find(l => alts[l] === gabaritoText) ?? "A";
    onAlternativasGeradas?.(alts, gabaritoLetra);
  }, [assertivas, onAlternativasGeradas]);

  const correctaCount = assertivas.filter(a => a.correta).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Assertivas ({assertivas.length}/5)</Label>
        {assertivas.length < 5 && (
          <Button size="sm" variant="outline" onClick={addAssertiva} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {assertivas.map((a, i) => (
          <div key={i} className={`rounded-lg border p-3 space-y-2 transition-colors ${a.correta ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/50 bg-muted/10"}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary w-6 shrink-0">{a.label}</span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-auto">
                <Checkbox
                  checked={a.correta}
                  onCheckedChange={v => update(i, { correta: !!v })}
                />
                <span className={a.correta ? "text-emerald-400 font-medium" : "text-muted-foreground"}>
                  {a.correta ? "✓ VERDADEIRA" : "✗ FALSA"}
                </span>
              </label>
              {assertivas.length > 2 && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeAssertiva(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Textarea
              placeholder={`Texto da assertiva ${a.label}...`}
              value={a.textPt}
              onChange={e => update(i, { textPt: e.target.value })}
              rows={2}
              className="text-sm resize-none bg-background"
            />
          </div>
        ))}
      </div>

      {assertivas.length >= 2 && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
          <span className="text-xs text-muted-foreground">
            {correctaCount} verdadeira(s) · {assertivas.length - correctaCount} falsa(s)
          </span>
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={gerarAlts}
            disabled={correctaCount === 0 || correctaCount === assertivas.length}>
            <ArrowUpDown className="h-3 w-3" /> Gerar alternativas
          </Button>
        </div>
      )}

      {(correctaCount === 0 || correctaCount === assertivas.length) && assertivas.length > 0 && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Marque pelo menos uma verdadeira e uma falsa para gerar alternativas.
        </p>
      )}
    </div>
  );
}

// ─── M5 Form ──────────────────────────────────────────────────────────────────

interface M5FormProps {
  assertion1: string;
  assertion2: string;
  a1Verdadeira: boolean;
  a2Verdadeira: boolean;
  relacaoCausal: boolean;
  onChange: (patch: {
    assertion1?: string; assertion2?: string;
    a1Verdadeira?: boolean; a2Verdadeira?: boolean; relacaoCausal?: boolean;
  }) => void;
}

export function M5FormSection({
  assertion1, assertion2, a1Verdadeira, a2Verdadeira, relacaoCausal, onChange,
}: M5FormProps) {
  const gabarito = gabaritoPorM5Booleans(a1Verdadeira, a2Verdadeira, relacaoCausal);
  const showRelacao = a1Verdadeira && a2Verdadeira;

  return (
    <div className="space-y-3">
      {/* Asserção I */}
      <div className={`rounded-lg border p-3 space-y-2 ${a1Verdadeira ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-primary">Asserção I</Label>
          <div className="flex gap-2">
            {(["V", "F"] as const).map(v => (
              <button
                key={v}
                onClick={() => onChange({ a1Verdadeira: v === "V" })}
                className={`px-2.5 py-0.5 text-xs font-bold rounded border transition-colors ${
                  (v === "V") === a1Verdadeira
                    ? v === "V" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400"
                    : "border-border/50 text-muted-foreground hover:bg-muted/20"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          placeholder="Texto da Asserção I (a proposição principal)..."
          value={assertion1}
          onChange={e => onChange({ assertion1: e.target.value })}
          rows={3}
          className="text-sm resize-none bg-background"
        />
      </div>

      {/* PORQUE separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-bold text-amber-400 tracking-wider px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded">
          PORQUE
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Asserção II (Razão) */}
      <div className={`rounded-lg border p-3 space-y-2 ${a2Verdadeira ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-primary">Asserção II (Razão)</Label>
          <div className="flex gap-2">
            {(["V", "F"] as const).map(v => (
              <button
                key={v}
                onClick={() => onChange({ a2Verdadeira: v === "V", relacaoCausal: v === "F" ? false : relacaoCausal })}
                className={`px-2.5 py-0.5 text-xs font-bold rounded border transition-colors ${
                  (v === "V") === a2Verdadeira
                    ? v === "V" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400"
                    : "border-border/50 text-muted-foreground hover:bg-muted/20"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          placeholder="Texto da Asserção II — a razão alegada para a Asserção I..."
          value={assertion2}
          onChange={e => onChange({ assertion2: e.target.value })}
          rows={3}
          className="text-sm resize-none bg-background"
        />
      </div>

      {/* Relação causal (só ativa quando ambas são V) */}
      {showRelacao && (
        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-muted/20 border border-border/30">
          <Checkbox
            checked={relacaoCausal}
            onCheckedChange={v => onChange({ relacaoCausal: !!v })}
          />
          <span className="text-sm">A Asserção II é uma justificativa CORRETA da Asserção I</span>
        </label>
      )}

      {/* Gabarito automático */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${
        gabarito === "A" ? "border-violet-500/40 bg-violet-500/10" : "border-border/40 bg-muted/10"
      }`}>
        <span className="text-xs text-muted-foreground">Gabarito determinado automaticamente:</span>
        <Badge className="bg-primary/20 text-primary border-primary/40 text-sm font-bold">{gabarito}</Badge>
        <span className="text-xs text-muted-foreground">{descricaoGabaritoM5(gabarito)}</span>
      </div>
    </div>
  );
}

// ─── M8 Form ──────────────────────────────────────────────────────────────────

interface M8FormProps {
  esquerda: MatchingColDraft[];
  direita:  MatchingColDraft[];
  pairs:    MatchingPairDraft[];
  onChange: (esquerda: MatchingColDraft[], direita: MatchingColDraft[], pairs: MatchingPairDraft[]) => void;
  onAlternativasGeradas?: (alts: Record<string, string>, gabarito: string) => void;
}

export function M8FormSection({ esquerda, direita, pairs, onChange, onAlternativasGeradas }: M8FormProps) {
  const addLeft = () => {
    if (esquerda.length >= 6) return;
    onChange([...esquerda, { label: String(esquerda.length + 1), textPt: "" }], direita, pairs);
  };
  const addRight = () => {
    if (direita.length >= 6) return;
    const label = String.fromCharCode(97 + direita.length); // a, b, c...
    onChange(esquerda, [...direita, { label, textPt: "" }], pairs);
  };
  const setPair = (esquerdaOrdem: number, direitaOrdem: number) => {
    const filtered = pairs.filter(p => p.esquerdaOrdem !== esquerdaOrdem);
    onChange(esquerda, direita, [...filtered, { esquerdaOrdem, direitaOrdem }]);
  };
  const updateLeft  = (i: number, textPt: string) => onChange(esquerda.map((e, idx) => idx === i ? { ...e, textPt } : e), direita, pairs);
  const updateRight = (i: number, textPt: string) => onChange(esquerda, direita.map((d, idx) => idx === i ? { ...d, textPt } : d), pairs);
  const removeLeft  = (i: number) => {
    const next = esquerda.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, label: String(idx + 1) }));
    onChange(next, direita, pairs.filter(p => p.esquerdaOrdem !== i + 1).map(p => ({ ...p, esquerdaOrdem: p.esquerdaOrdem > i + 1 ? p.esquerdaOrdem - 1 : p.esquerdaOrdem })));
  };
  const removeRight = (i: number) => {
    const next = direita.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, label: String.fromCharCode(97 + idx) }));
    onChange(esquerda, next, pairs.filter(p => p.direitaOrdem !== i + 1).map(p => ({ ...p, direitaOrdem: p.direitaOrdem > i + 1 ? p.direitaOrdem - 1 : p.direitaOrdem })));
  };

  const gerarAlts = useCallback(() => {
    const alts = gerarAlternativasM8(esquerda, direita, pairs);
    const corretaStr = esquerda.map((e, ei) => {
      const pair = pairs.find(p => p.esquerdaOrdem === ei + 1);
      const dir = pair ? direita[pair.direitaOrdem - 1] : null;
      return dir ? `${e.label}-${dir.label}` : "";
    }).filter(Boolean).join(" / ");
    const gabaritoLetra = ALT_LABELS.find(l => alts[l] === corretaStr) ?? "A";
    onAlternativasGeradas?.(alts, gabaritoLetra);
  }, [esquerda, direita, pairs, onAlternativasGeradas]);

  const allPaired = esquerda.length > 0 && esquerda.every((_, i) => pairs.some(p => p.esquerdaOrdem === i + 1));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Coluna Esquerda */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Coluna I (esquerda)</Label>
            {esquerda.length < 6 && (
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-0.5 px-2" onClick={addLeft}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          {esquerda.map((e, i) => (
            <div key={i} className="flex gap-1 items-start">
              <span className="text-xs font-bold text-primary mt-2 w-5 shrink-0">{e.label}.</span>
              <Input
                value={e.textPt}
                onChange={ev => updateLeft(i, ev.target.value)}
                placeholder={`Item ${e.label}`}
                className="text-sm h-8"
              />
              {esquerda.length > 2 && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeLeft(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Coluna Direita */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Coluna II (direita)</Label>
            {direita.length < 6 && (
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-0.5 px-2" onClick={addRight}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          {direita.map((d, i) => (
            <div key={i} className="flex gap-1 items-start">
              <span className="text-xs font-bold text-blue-400 mt-2 w-5 shrink-0">{d.label})</span>
              <Input
                value={d.textPt}
                onChange={ev => updateRight(i, ev.target.value)}
                placeholder={`Item ${d.label}`}
                className="text-sm h-8"
              />
              {direita.length > 2 && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeRight(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pares corretos */}
      {esquerda.length > 0 && direita.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Pares corretos
          </Label>
          <div className="space-y-1">
            {esquerda.map((e, i) => {
              const currentPair = pairs.find(p => p.esquerdaOrdem === i + 1);
              return (
                <div key={i} className={`flex items-center gap-2 p-2 rounded border text-sm ${currentPair ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/30"}`}>
                  <span className="font-bold text-primary w-5">{e.label}.</span>
                  <span className="flex-1 text-xs truncate">{e.textPt || `Item ${e.label}`}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={currentPair ? String(currentPair.direitaOrdem) : "__none__"}
                    onValueChange={v => v !== "__none__" && setPair(i + 1, Number(v))}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue placeholder="parear..." />
                    </SelectTrigger>
                    <SelectContent>
                      {direita.map((d, di) => (
                        <SelectItem key={di} value={String(di + 1)}>
                          {d.label}) {d.textPt.slice(0, 20) || `Item ${d.label}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allPaired && (
        <Button size="sm" variant="secondary" className="h-7 text-xs gap-1 w-full" onClick={gerarAlts}>
          <ArrowUpDown className="h-3 w-3" /> Gerar alternativas A–E automaticamente
        </Button>
      )}
    </div>
  );
}

// ─── M10 Form ─────────────────────────────────────────────────────────────────

interface M10FormProps {
  group: QuestionGroupDraft;
  onChange: (group: QuestionGroupDraft) => void;
}

export function M10FormSection({ group, onChange }: M10FormProps) {
  const set = <K extends keyof QuestionGroupDraft>(k: K, v: QuestionGroupDraft[K]) =>
    onChange({ ...group, [k]: v });
  const setAlt = (letra: string, texto: string) =>
    onChange({ ...group, alternativas: { ...group.alternativas, [letra]: texto } });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">ID do Bloco *</Label>
          <Input
            value={group.grupoId}
            onChange={e => set("grupoId", e.target.value)}
            placeholder="ex: ENADE2023_Q10"
            className="text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Título do Bloco</Label>
          <Input
            value={group.titulo ?? ""}
            onChange={e => set("titulo", e.target.value)}
            placeholder="ex: Caso Clínico — Bovino"
            className="text-sm h-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Texto-base compartilhado *</Label>
        <Textarea
          value={group.textBasePt}
          onChange={e => set("textBasePt", e.target.value)}
          placeholder="Texto apresentado uma única vez antes de todas as questões do bloco..."
          rows={4}
          className="text-sm resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          Alternativas fixas do bloco (A–E)
          <span className="text-[10px] text-amber-400">• as mesmas para todas as questões</span>
        </Label>
        <div className="space-y-1.5">
          {ALT_LABELS.map(letra => (
            <div key={letra} className="flex gap-2 items-center">
              <span className="text-sm font-bold text-primary w-5">{letra}</span>
              <Input
                value={group.alternativas[letra] ?? ""}
                onChange={e => setAlt(letra, e.target.value)}
                placeholder={`Alternativa ${letra}...`}
                className="text-sm h-8"
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Após criar o grupo, cada questão do bloco define seu próprio <strong>comando</strong> e qual das 5 alternativas é correta para aquele comando.
      </p>
    </div>
  );
}
