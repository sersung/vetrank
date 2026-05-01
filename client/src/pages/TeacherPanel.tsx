import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BookOpen, Plus, CheckCircle, XCircle, Upload, Image, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";

const QUESTION_MODELS = [
  { value: "standard", label: "Padrão (4 alternativas)" },
  { value: "enade", label: "ENADE (5 alternativas com contexto)" },
  { value: "true_false", label: "Verdadeiro / Falso" },
  { value: "assertion_reason", label: "Asserção-Razão" },
];

export default function TeacherPanel() {
  const { user } = useAuth();
  const allowed = ["teacher", "coordinator", "superuser", "admin"];
  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas professores podem acessar esta área.</p>
          <Link href="/"><Button className="mt-4">Voltar ao início</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
              Painel do Professor
            </h1>
            <p className="text-muted-foreground">Crie e valide questões para a plataforma.</p>
          </div>
        </div>

        <Tabs defaultValue="create">
          <TabsList className="mb-6">
            <TabsTrigger value="create"><Plus className="w-4 h-4 mr-2" />Criar Questão</TabsTrigger>
            <TabsTrigger value="validate"><CheckCircle className="w-4 h-4 mr-2" />Validar Questões</TabsTrigger>
            <TabsTrigger value="my"><FileText className="w-4 h-4 mr-2" />Minhas Questões</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <CreateQuestionForm />
          </TabsContent>
          <TabsContent value="validate">
            <ValidationQueue />
          </TabsContent>
          <TabsContent value="my">
            <MyQuestions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CreateQuestionForm() {
  const { data: perms } = trpc.teacher.myPermissions.useQuery();
  const { data: allSubjects } = trpc.questions.allSubjects.useQuery();

  const [disciplineId, setDisciplineId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [model, setModel] = useState<"standard" | "enade" | "true_false" | "assertion_reason">("standard");
  const [year, setYear] = useState("");
  const [textPt, setTextPt] = useState("");
  const [textEn, setTextEn] = useState("");
  const [explanationPt, setExplanationPt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [correctOption, setCorrectOption] = useState("A");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const numOptions = model === "enade" ? 5 : model === "true_false" ? 2 : 4;
  const optionLabels = ["A", "B", "C", "D", "E"].slice(0, numOptions);
  const [optionTexts, setOptionTexts] = useState<string[]>(["", "", "", ""]);

  const uploadMutation = trpc.teacher.getImageUploadUrl.useMutation({
    onSuccess: (data) => { setImageUrl(data.url); toast.success("Imagem enviada!"); setUploading(false); },
    onError: (e) => { toast.error(e.message); setUploading(false); },
  });

  const createMutation = trpc.teacher.createQuestion.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "pending"
        ? "Questão enviada para validação!"
        : "Questão criada e aprovada!");
      setTextPt(""); setTextEn(""); setExplanationPt(""); setImageUrl("");
      setOptionTexts(["", "", "", ""]);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({ filename: file.name, contentType: file.type, base64Data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!disciplineId || !textPt || optionTexts.slice(0, numOptions).some(o => !o)) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const options = optionLabels.map((id, i) => ({ id, textPt: optionTexts[i] || "", textEn: "" }));
    createMutation.mutate({
      disciplineId: Number(disciplineId),
      subjectId: subjectId ? Number(subjectId) : undefined,
      difficulty,
      year: year ? Number(year) : undefined,
      questionModel: model,
      textPt,
      textEn: textEn || undefined,
      imageUrl: imageUrl || undefined,
      options,
      correctOption,
      explanationPt: explanationPt || undefined,
      isPremium,
    });
  };

  const filteredSubjects = (allSubjects as any[] | undefined)?.filter(
    (s: any) => !disciplineId || s.disciplineId === Number(disciplineId)
  );

  return (
    <Card>
      <CardHeader><CardTitle>Nova Questão</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block">Disciplina *</Label>
            <Select onValueChange={setDisciplineId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(perms as any[])?.map((p: any) => (
                  <SelectItem key={p.disciplineId} value={String(p.disciplineId)}>{p.disciplineName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Assunto</Label>
            <Select onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
              <SelectContent>
                {filteredSubjects?.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.namePt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Modelo</Label>
            <Select value={model} onValueChange={(v) => setModel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Dificuldade *</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Fácil</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="hard">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Ano</Label>
            <Input placeholder="Ex: 2024" value={year} onChange={e => setYear(e.target.value)} type="number" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
            <Label>Questão Premium</Label>
          </div>
        </div>

        <div>
          <Label className="mb-1 block">Enunciado (PT) *</Label>
          <Textarea
            placeholder="Digite o enunciado da questão em português..."
            value={textPt}
            onChange={e => setTextPt(e.target.value)}
            rows={4}
          />
        </div>

        <div>
          <Label className="mb-1 block">Enunciado (EN) — opcional</Label>
          <Textarea
            placeholder="Question text in English (optional)..."
            value={textEn}
            onChange={e => setTextEn(e.target.value)}
            rows={2}
          />
        </div>

        {/* Image upload */}
        <div>
          <Label className="mb-1 block">Imagem da Questão (opcional)</Label>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? "Enviando..." : "Enviar Imagem"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {imageUrl && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Image className="w-4 h-4" />
                <span>Imagem carregada</span>
                <button onClick={() => setImageUrl("")} className="text-destructive text-xs">Remover</button>
              </div>
            )}
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Preview" className="mt-2 max-h-40 rounded-lg border border-border" />
          )}
        </div>

        {/* Options */}
        <div>
          <Label className="mb-2 block">Alternativas *</Label>
          <div className="space-y-2">
            {optionLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <button
                  onClick={() => setCorrectOption(label)}
                  className={`w-8 h-8 rounded-full border-2 font-bold text-sm shrink-0 transition-colors ${
                    correctOption === label
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {label}
                </button>
                <Input
                  placeholder={`Alternativa ${label}...`}
                  value={optionTexts[i] || ""}
                  onChange={e => {
                    const updated = [...optionTexts];
                    updated[i] = e.target.value;
                    setOptionTexts(updated);
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Clique na letra para marcar a resposta correta.</p>
        </div>

        <div>
          <Label className="mb-1 block">Explicação / Comentário (PT)</Label>
          <Textarea
            placeholder="Explique o gabarito..."
            value={explanationPt}
            onChange={e => setExplanationPt(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Enviar Questão
        </Button>
      </CardContent>
    </Card>
  );
}

function ValidationQueue() {
  const { data: pending, refetch } = trpc.teacher.pendingValidation.useQuery({ limit: 20 });
  const validateMutation = trpc.teacher.validateQuestion.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approved" ? "Questão aprovada!" : "Questão rejeitada.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!pending || pending.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma questão pendente de validação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{pending.length} questão(ões) aguardando validação</p>
      {(pending as any[]).map((q: any) => (
        <Card key={q.id} className="border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{q.disciplineName}</Badge>
                  <Badge variant="outline" className="text-xs">{q.questionModel}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{q.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Por: {q.creatorName || "Desconhecido"}</p>
              </div>
            </div>
            <p className="text-sm mb-3 leading-relaxed">{q.textPt}</p>
            {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-32 rounded mb-3 border border-border" />}
            <div className="space-y-1 mb-3">
              {(q.options as any[])?.map((opt: any) => (
                <div key={opt.id} className={`text-xs p-2 rounded ${opt.id === q.correctOption ? "bg-green-500/20 text-green-400" : "bg-muted/30"}`}>
                  <span className="font-bold mr-2">{opt.id}.</span>{opt.textPt}
                </div>
              ))}
            </div>
            {q.explanationPt && (
              <p className="text-xs text-muted-foreground italic mb-3">💡 {q.explanationPt}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => validateMutation.mutate({ questionId: q.id, action: "approved" })}
              >
                <CheckCircle className="w-4 h-4 mr-1" />Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => validateMutation.mutate({ questionId: q.id, action: "rejected" })}
              >
                <XCircle className="w-4 h-4 mr-1" />Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MyQuestions() {
  const { data: questions } = trpc.teacher.myQuestions.useQuery({ status: "all" });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada",
  };

  return (
    <Card>
      <CardHeader><CardTitle>Minhas Questões ({questions?.length ?? 0})</CardTitle></CardHeader>
      <CardContent>
        {!questions || questions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Você ainda não criou nenhuma questão.</p>
        ) : (
          <div className="space-y-3">
            {(questions as any[]).map((q: any) => (
              <div key={q.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">{q.textPt}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{q.disciplineName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{q.difficulty}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{q.questionModel}</span>
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ${statusColors[q.status] || ""}`}>
                  {statusLabels[q.status] || q.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
