import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Crown,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";

export default function DiscursiveBank() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  const [disciplineFilter, setDisciplineFilter] = useState<number | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  // Debounce search to avoid excessive queries on each keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});

  // Admin state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [form, setForm] = useState({
    disciplineId: "", subjectId: "", subjectTag: "", author: "",
    difficulty: "medium", year: "", isPremium: true,
    textPt: "", textEn: "", expectedAnswerPt: "", expectedAnswerEn: "",
  });

  const { data: disciplines } = trpc.questions.allDisciplines.useQuery();
  const { data: result, refetch } = trpc.discursive.list.useQuery({
    disciplineId: disciplineFilter,
    difficulty: difficultyFilter as any,
    search: debouncedSearch || undefined,
    page,
    limit: 15,
  });

  const createMutation = trpc.discursive.create.useMutation();
  const updateMutation = trpc.discursive.update.useMutation();
  const deleteMutation = trpc.discursive.delete.useMutation();

  const isAdmin = user?.role === "admin" || user?.role === "teacher";
  const canSeeAnswers = isAuthenticated && (user?.role === "admin" || user?.role === "teacher" || (user as any)?.plan !== "free");

  const resetForm = () => setForm({
    disciplineId: "", subjectId: "", subjectTag: "", author: "",
    difficulty: "medium", year: "", isPremium: true,
    textPt: "", textEn: "", expectedAnswerPt: "", expectedAnswerEn: "",
  });

  const handleOpenAdd = () => {
    resetForm();
    setEditingQuestion(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (q: any) => {
    setForm({
      disciplineId: String(q.disciplineId ?? ""),
      subjectId: String(q.subjectId ?? ""),
      subjectTag: q.subjectTag ?? "",
      author: q.author ?? "",
      difficulty: q.difficulty ?? "medium",
      year: q.year ? String(q.year) : "",
      isPremium: q.isPremium ?? true,
      textPt: q.textPt ?? "",
      textEn: q.textEn ?? "",
      expectedAnswerPt: q.expectedAnswerPt ?? "",
      expectedAnswerEn: q.expectedAnswerEn ?? "",
    });
    setEditingQuestion(q);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!form.textPt || !form.disciplineId || !form.expectedAnswerPt) {
      toast.error(language === "pt" ? "Preencha os campos obrigatórios (enunciado, grande área, resposta esperada)" : "Fill required fields");
      return;
    }
    try {
      const payload = {
        disciplineId: parseInt(form.disciplineId),
        subjectId: form.subjectId ? parseInt(form.subjectId) : undefined,
        subjectTag: form.subjectTag || undefined,
        author: form.author || undefined,
        difficulty: form.difficulty as "easy" | "medium" | "hard",
        year: form.year ? parseInt(form.year) : undefined,
        isPremium: form.isPremium,
        textPt: form.textPt,
        textEn: form.textEn || undefined,
        expectedAnswerPt: form.expectedAnswerPt,
        expectedAnswerEn: form.expectedAnswerEn || undefined,
      };
      if (editingQuestion) {
        await updateMutation.mutateAsync({ id: editingQuestion.id, ...payload });
        toast.success(language === "pt" ? "Questão atualizada!" : "Question updated!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(language === "pt" ? "Questão criada!" : "Question created!");
      }
      setShowAddDialog(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(language === "pt" ? "Excluir esta questão discursiva?" : "Delete this discursive question?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success(language === "pt" ? "Questão excluída!" : "Question deleted!");
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const questions = result?.questions ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">
              {language === "pt" ? "Questões Discursivas" : "Discursive Questions"}
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              {language === "pt"
                ? "Banco de questões abertas para estudo aprofundado"
                : "Open question bank for in-depth study"}
            </p>
          </div>
          {isAdmin && (
            <Button
              className="bg-primary text-primary-foreground gap-2 font-sans"
              onClick={handleOpenAdd}
            >
              <Plus className="h-4 w-4" />
              {language === "pt" ? "Nova Questão" : "New Question"}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === "pt" ? "Buscar questões..." : "Search questions..."}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background border-border/50 font-sans"
            />
          </div>
          <Select value={disciplineFilter ? String(disciplineFilter) : "all"} onValueChange={(v) => { setDisciplineFilter(v === "all" ? undefined : parseInt(v)); setPage(1); }}>
            <SelectTrigger className="w-44 bg-background border-border/50 font-sans">
              <SelectValue placeholder={language === "pt" ? "Grande Área" : "Major Area"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "pt" ? "Todas" : "All"}</SelectItem>
              {disciplines?.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter ?? "all"} onValueChange={(v) => { setDifficultyFilter(v === "all" ? undefined : v); setPage(1); }}>
            <SelectTrigger className="w-36 bg-background border-border/50 font-sans">
              <SelectValue placeholder={language === "pt" ? "Dificuldade" : "Difficulty"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "pt" ? "Todas" : "All"}</SelectItem>
              <SelectItem value="easy">{language === "pt" ? "Fácil" : "Easy"}</SelectItem>
              <SelectItem value="medium">{language === "pt" ? "Médio" : "Medium"}</SelectItem>
              <SelectItem value="hard">{language === "pt" ? "Difícil" : "Hard"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Premium notice for free users */}
        {isAuthenticated && !canSeeAnswers && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-400 shrink-0" />
            <p className="text-sm font-sans text-yellow-300">
              {language === "pt"
                ? "As respostas esperadas são exclusivas para assinantes. Faça upgrade para ver."
                : "Expected answers are exclusive to subscribers. Upgrade to view."}
            </p>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-sans">
              {language === "pt" ? "Faça " : ""}
              <a href={getLoginUrl()} className="text-primary underline">{language === "pt" ? "login" : "log in"}</a>
              {language === "pt" ? " para ver as respostas esperadas." : " to view expected answers."}
            </p>
          </div>
        )}

        {/* Question list */}
        <div className="space-y-3">
          {questions.map((q: any) => (
            <div key={q.id} className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans font-medium leading-relaxed line-clamp-3">{q.textPt}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className={`text-xs font-sans border ${
                        q.difficulty === "easy" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        q.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}>{q.difficulty}</Badge>
                      {q.year && <Badge variant="outline" className="text-xs font-sans">{q.year}</Badge>}
                      {q.subjectTag && <Badge variant="outline" className="text-xs font-sans">{q.subjectTag}</Badge>}
                      {q.author && <Badge variant="outline" className="text-xs font-sans text-muted-foreground">{q.author}</Badge>}
                      {q.isPremium && <Badge className="text-xs font-sans bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border"><Crown className="h-2.5 w-2.5 mr-1" />Premium</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleOpenEdit(q); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {expandedId === q.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {expandedId === q.id && (
                <div className="border-t border-border/30 p-4 space-y-3">
                  {q.textEn && (
                    <div className="p-3 bg-background rounded-lg border border-border/30">
                      <p className="text-xs text-muted-foreground font-sans mb-1">EN</p>
                      <p className="text-sm font-sans">{q.textEn}</p>
                    </div>
                  )}

                  {/* Expected answer section */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 font-sans text-xs mb-2"
                      onClick={() => setShowAnswer((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      disabled={!canSeeAnswers}
                    >
                      {showAnswer[q.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showAnswer[q.id]
                        ? (language === "pt" ? "Ocultar Resposta" : "Hide Answer")
                        : (language === "pt" ? "Ver Resposta Esperada" : "View Expected Answer")}
                      {!canSeeAnswers && <Crown className="h-3 w-3 text-yellow-400" />}
                    </Button>

                    {showAnswer[q.id] && q.expectedAnswerPt && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs text-primary font-sans font-medium mb-1">
                          {language === "pt" ? "Resposta Esperada:" : "Expected Answer:"}
                        </p>
                        <p className="text-sm font-sans leading-relaxed">{q.expectedAnswerPt}</p>
                        {q.expectedAnswerEn && (
                          <p className="text-xs text-muted-foreground font-sans mt-2 italic">{q.expectedAnswerEn}</p>
                        )}
                      </div>
                    )}

                    {showAnswer[q.id] && !q.expectedAnswerPt && (
                      <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <p className="text-xs text-yellow-400 font-sans">
                          {language === "pt" ? "Faça upgrade para ver a resposta esperada." : "Upgrade to view the expected answer."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground font-sans">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{language === "pt" ? "Nenhuma questão discursiva encontrada." : "No discursive questions found."}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="font-sans">
              ← {language === "pt" ? "Anterior" : "Previous"}
            </Button>
            <span className="flex items-center text-sm text-muted-foreground font-sans px-3">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="font-sans">
              {language === "pt" ? "Próxima" : "Next"} →
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingQuestion
                ? (language === "pt" ? "Editar Questão Discursiva" : "Edit Discursive Question")
                : (language === "pt" ? "Nova Questão Discursiva" : "New Discursive Question")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.disciplineId} onValueChange={(v) => setForm((p) => ({ ...p, disciplineId: v }))}>
                <SelectTrigger className="bg-background font-sans">
                  <SelectValue placeholder={language === "pt" ? "Grande Área *" : "Major Area *"} />
                </SelectTrigger>
                <SelectContent>
                  {disciplines?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.difficulty} onValueChange={(v) => setForm((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger className="bg-background font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{language === "pt" ? "Fácil" : "Easy"}</SelectItem>
                  <SelectItem value="medium">{language === "pt" ? "Médio" : "Medium"}</SelectItem>
                  <SelectItem value="hard">{language === "pt" ? "Difícil" : "Hard"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={language === "pt" ? "Tag de disciplina" : "Discipline tag"} value={form.subjectTag} onChange={(e) => setForm((p) => ({ ...p, subjectTag: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder={language === "pt" ? "Autor / Banca" : "Author / Board"} value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} className="font-sans bg-background" />
            </div>
            <textarea
              placeholder={language === "pt" ? "Enunciado da questão (PT) *" : "Question text (PT) *"}
              value={form.textPt}
              onChange={(e) => setForm((p) => ({ ...p, textPt: e.target.value }))}
              className="w-full h-24 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder={language === "pt" ? "Enunciado da questão (EN)" : "Question text (EN)"}
              value={form.textEn}
              onChange={(e) => setForm((p) => ({ ...p, textEn: e.target.value }))}
              className="w-full h-16 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder={language === "pt" ? "Resposta esperada (PT) *" : "Expected answer (PT) *"}
              value={form.expectedAnswerPt}
              onChange={(e) => setForm((p) => ({ ...p, expectedAnswerPt: e.target.value }))}
              className="w-full h-24 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder={language === "pt" ? "Resposta esperada (EN)" : "Expected answer (EN)"}
              value={form.expectedAnswerEn}
              onChange={(e) => setForm((p) => ({ ...p, expectedAnswerEn: e.target.value }))}
              className="w-full h-16 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={language === "pt" ? "Ano (opcional)" : "Year (optional)"} value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} className="font-sans bg-background" />
              <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background">
                <input
                  type="checkbox"
                  id="isPremiumDisc"
                  checked={form.isPremium}
                  onChange={(e) => setForm((p) => ({ ...p, isPremium: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPremiumDisc" className="text-sm font-sans cursor-pointer">
                  {language === "pt" ? "Premium" : "Premium"}
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 font-sans">
                {language === "pt" ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground font-sans"
              >
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === "pt" ? "Salvar" : "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
