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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  Brain,
  Calendar,
  Crown,
  Database,
  Edit,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";

export default function AdminPanel() {
  const t = useT();
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: disciplines, refetch: refetchDisciplines } = trpc.admin.disciplines.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: subjects, refetch: refetchSubjects } = trpc.admin.subjects.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: questions, refetch: refetchQuestions } = trpc.questions.list.useQuery({ page: 1, limit: 50 }, { enabled: user?.role === "admin" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPlanFilter, setCustomerPlanFilter] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const { data: customers } = trpc.admin.customers.useQuery(
    { search: customerSearch || undefined, plan: customerPlanFilter as any || undefined, page: 1, limit: 50 },
    { enabled: user?.role === "admin" }
  );
  const { data: customerDetail } = trpc.admin.customerDetail.useQuery(
    { userId: selectedCustomer! },
    { enabled: user?.role === "admin" && !!selectedCustomer }
  );
  const updateCustomerPlan = trpc.admin.updateCustomerPlan.useMutation();

  const seedMutation = trpc.admin.seed.useMutation();
  const createDiscipline = trpc.admin.createDiscipline.useMutation();
  const createSubject = trpc.admin.createSubject.useMutation();
  const deleteQuestion = trpc.questions.delete.useMutation();
  const generateAi = trpc.ai.generateQuestion.useMutation();
  const importCsv = trpc.questions.importCsv.useMutation();
  const createQuestion = trpc.questions.create.useMutation();

  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAiGen, setShowAiGen] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState({ slug: "", namePt: "", nameEn: "" });
  const [newSubject, setNewSubject] = useState({ disciplineId: "", slug: "", namePt: "", nameEn: "" });
  const [aiGenConfig, setAiGenConfig] = useState({ disciplineId: "", difficulty: "medium", topic: "" });
  const [aiGenResult, setAiGenResult] = useState<any>(null);
  const [newQuestion, setNewQuestion] = useState({
    textPt: "", textEn: "", disciplineId: "", subjectId: "",
    difficulty: "medium", year: "", isPremium: false,
    optA: "", optB: "", optC: "", optD: "",
    optAEn: "", optBEn: "", optCEn: "", optDEn: "",
    correctOption: "A", explanationPt: "", explanationEn: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">
            {language === "pt" ? "Acesso Restrito" : "Restricted Access"}
          </h2>
          <p className="text-muted-foreground font-sans">
            {language === "pt" ? "Apenas administradores podem acessar esta página." : "Only administrators can access this page."}
          </p>
        </div>
      </div>
    );
  }

  const handleSeed = async () => {
    try {
      await seedMutation.mutateAsync();
      toast.success(language === "pt" ? "Dados inicializados com sucesso!" : "Data initialized successfully!");
      refetchDisciplines();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddDiscipline = async () => {
    if (!newDiscipline.slug || !newDiscipline.namePt || !newDiscipline.nameEn) {
      toast.error(language === "pt" ? "Preencha todos os campos" : "Fill all fields");
      return;
    }
    try {
      await createDiscipline.mutateAsync(newDiscipline);
      toast.success(language === "pt" ? "Disciplina criada!" : "Discipline created!");
      setShowAddDiscipline(false);
      setNewDiscipline({ slug: "", namePt: "", nameEn: "" });
      refetchDisciplines();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.disciplineId || !newSubject.slug || !newSubject.namePt || !newSubject.nameEn) {
      toast.error(language === "pt" ? "Preencha todos os campos" : "Fill all fields");
      return;
    }
    try {
      await createSubject.mutateAsync({ ...newSubject, disciplineId: parseInt(newSubject.disciplineId) });
      toast.success(language === "pt" ? "Assunto criado!" : "Subject created!");
      setShowAddSubject(false);
      setNewSubject({ disciplineId: "", slug: "", namePt: "", nameEn: "" });
      refetchSubjects();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm(language === "pt" ? "Excluir esta questão?" : "Delete this question?")) return;
    try {
      await deleteQuestion.mutateAsync({ id });
      toast.success(language === "pt" ? "Questão excluída!" : "Question deleted!");
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiGenConfig.disciplineId) {
      toast.error(language === "pt" ? "Selecione uma disciplina" : "Select a discipline");
      return;
    }
    const disc = disciplines?.find((d) => String(d.id) === aiGenConfig.disciplineId);
    if (!disc) return;
    try {
      const result = await generateAi.mutateAsync({
        disciplineId: parseInt(aiGenConfig.disciplineId),
        disciplineName: language === "pt" ? disc.namePt : disc.nameEn,
        difficulty: aiGenConfig.difficulty as "easy" | "medium" | "hard",
        topic: aiGenConfig.topic || undefined,
        language: language as "pt" | "en",
      });
      setAiGenResult(result.question);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveAiQuestion = async () => {
    if (!aiGenResult) return;
    try {
      const options = aiGenResult.options.map((o: any) => ({
        id: o.id,
        textPt: o.textPt,
        textEn: o.textEn,
      }));
      await createQuestion.mutateAsync({
        textPt: aiGenResult.textPt,
        textEn: aiGenResult.textEn,
        disciplineId: aiGenResult.disciplineId,
        difficulty: aiGenResult.difficulty,
        options,
        correctOption: aiGenResult.correctOption,
        explanationPt: aiGenResult.explanationPt,
        explanationEn: aiGenResult.explanationEn,
      });
      toast.success(language === "pt" ? "Questão salva!" : "Question saved!");
      setAiGenResult(null);
      setShowAiGen(false);
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.textPt || !newQuestion.disciplineId || !newQuestion.optA || !newQuestion.optB || !newQuestion.optC || !newQuestion.optD) {
      toast.error(language === "pt" ? "Preencha os campos obrigatórios" : "Fill required fields");
      return;
    }
    try {
      const options = [
        { id: "A", textPt: newQuestion.optA, textEn: newQuestion.optAEn || newQuestion.optA },
        { id: "B", textPt: newQuestion.optB, textEn: newQuestion.optBEn || newQuestion.optB },
        { id: "C", textPt: newQuestion.optC, textEn: newQuestion.optCEn || newQuestion.optC },
        { id: "D", textPt: newQuestion.optD, textEn: newQuestion.optDEn || newQuestion.optD },
      ];
      await createQuestion.mutateAsync({
        textPt: newQuestion.textPt,
        textEn: newQuestion.textEn || undefined,
        disciplineId: parseInt(newQuestion.disciplineId),
        subjectId: newQuestion.subjectId ? parseInt(newQuestion.subjectId) : undefined,
        difficulty: newQuestion.difficulty as "easy" | "medium" | "hard",
        year: newQuestion.year ? parseInt(newQuestion.year) : undefined,
        isPremium: newQuestion.isPremium,
        options,
        correctOption: newQuestion.correctOption,
        explanationPt: newQuestion.explanationPt || undefined,
        explanationEn: newQuestion.explanationEn || undefined,
      });
      toast.success(language === "pt" ? "Questão criada!" : "Question created!");
      setShowAddQuestion(false);
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const result = await importCsv.mutateAsync({ csv: text });
      toast.success(`${result.imported} ${language === "pt" ? "questões importadas!" : "questions imported!"}`);
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">{t("admin_title")}</h1>
            <p className="text-muted-foreground font-sans text-sm">
              {language === "pt" ? "Gerencie questões, disciplinas e assuntos" : "Manage questions, disciplines, and subjects"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="gap-2 font-sans text-sm"
          >
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {t("admin_seed")}
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t("admin_questions"), value: stats.totalQuestions, icon: BookOpen, color: "text-primary" },
              { label: t("admin_disciplines"), value: stats.totalDisciplines, icon: Database, color: "text-cyan-400" },
              { label: t("admin_subjects"), value: stats.totalSubjects, icon: Zap, color: "text-yellow-400" },
              { label: language === "pt" ? "Usuários" : "Users", value: stats.totalUsers, icon: Users, color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
                <div className={`font-serif text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground font-sans mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="questions">
          <TabsList className="mb-6 bg-card border border-border/50">
            <TabsTrigger value="questions" className="font-sans">{t("admin_questions")}</TabsTrigger>
            <TabsTrigger value="disciplines" className="font-sans">{t("admin_disciplines")}</TabsTrigger>
            <TabsTrigger value="subjects" className="font-sans">{t("admin_subjects")}</TabsTrigger>
            <TabsTrigger value="customers" className="font-sans gap-1">
              <Users className="h-3.5 w-3.5" />
              {language === "pt" ? "Clientes" : "Customers"}
            </TabsTrigger>
          </TabsList>

          {/* Questions tab */}
          <TabsContent value="questions">
            <div className="flex gap-3 mb-4 flex-wrap">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-sans"
                onClick={() => setShowAddQuestion(true)}
              >
                <Plus className="h-4 w-4" />
                {t("admin_add")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 font-sans"
                onClick={() => setShowAiGen(true)}
              >
                <Brain className="h-4 w-4" />
                {t("admin_generate_ai")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 font-sans"
                onClick={() => fileRef.current?.click()}
                disabled={importCsv.isPending}
              >
                {importCsv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("admin_import")}
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            </div>

            <div className="text-xs text-muted-foreground font-sans mb-3 p-3 bg-card rounded-lg border border-border/50">
              <strong>CSV format:</strong> textPt,textEn,disciplineId,difficulty,optA,optB,optC,optD,correctOption,explanationPt,year,isPremium
            </div>

            <div className="space-y-2">
              {questions?.questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl">
                  <span className="text-xs text-muted-foreground font-sans mt-0.5 w-6 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans line-clamp-2">{q.textPt}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge className={`text-xs font-sans border ${
                        q.difficulty === "easy" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        q.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}>{q.difficulty}</Badge>
                      {q.year && <Badge variant="outline" className="text-xs font-sans">{q.year}</Badge>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!questions?.questions.length && (
                <div className="text-center py-10 text-muted-foreground font-sans">
                  {language === "pt" ? "Nenhuma questão cadastrada. Clique em 'Inicializar Dados' para adicionar questões de exemplo." : "No questions yet. Click 'Initialize Data' to add sample questions."}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Disciplines tab */}
          <TabsContent value="disciplines">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-sans mb-4"
              onClick={() => setShowAddDiscipline(true)}
            >
              <Plus className="h-4 w-4" />
              {t("admin_add")}
            </Button>
            <div className="space-y-2">
              {disciplines?.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl">
                  <div className="flex-1">
                    <div className="font-medium font-sans text-sm">{d.namePt} / {d.nameEn}</div>
                    <div className="text-xs text-muted-foreground font-sans">{d.slug}</div>
                  </div>
                  <Badge variant="outline" className={`font-sans text-xs ${d.active ? "text-green-400 border-green-500/30" : "text-muted-foreground"}`}>
                    {d.active ? (language === "pt" ? "Ativa" : "Active") : (language === "pt" ? "Inativa" : "Inactive")}
                  </Badge>
                </div>
              ))}
              {!disciplines?.length && (
                <div className="text-center py-10 text-muted-foreground font-sans">
                  {language === "pt" ? "Nenhuma disciplina. Clique em 'Inicializar Dados'." : "No disciplines. Click 'Initialize Data'."}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Subjects tab */}
          <TabsContent value="subjects">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-sans mb-4"
              onClick={() => setShowAddSubject(true)}
            >
              <Plus className="h-4 w-4" />
              {t("admin_add")}
            </Button>
            <div className="space-y-2">
              {subjects?.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl">
                  <div className="flex-1">
                    <div className="font-medium font-sans text-sm">{s.namePt} / {s.nameEn}</div>
                    <div className="text-xs text-muted-foreground font-sans">{s.slug}</div>
                  </div>
                </div>
              ))}
              {!subjects?.length && (
                <div className="text-center py-10 text-muted-foreground font-sans">
                  {language === "pt" ? "Nenhum assunto cadastrado." : "No subjects yet."}
                </div>
              )}
            </div>
          </TabsContent>
          {/* Customers tab */}
          <TabsContent value="customers">
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder={language === "pt" ? "Buscar por nome ou email..." : "Search by name or email..."}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full h-9 rounded-md border border-border/50 bg-background px-3 py-1 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Select value={customerPlanFilter || "all"} onValueChange={(v) => setCustomerPlanFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40 bg-background border-border/50 font-sans h-9">
                  <SelectValue placeholder={language === "pt" ? "Plano" : "Plan"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "pt" ? "Todos" : "All"}</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer list */}
              <div className="space-y-2">
                {customers?.users.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all font-sans ${
                      selectedCustomer === c.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/50 bg-card hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{(c.name || c.email || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.name || language === "pt" ? "Sem nome" : "No name"}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.email || "—"}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-sans ${
                        c.plan === "premium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        c.plan === "trial" ? "bg-primary/20 text-primary border-primary/30" :
                        "bg-muted/30 text-muted-foreground border-border/30"
                      }`}>{c.plan}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{c.xp} XP</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{c.totalExams} {language === "pt" ? "simulados" : "exams"}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
                {!customers?.users.length && (
                  <div className="text-center py-10 text-muted-foreground font-sans">
                    {language === "pt" ? "Nenhum cliente encontrado." : "No customers found."}
                  </div>
                )}
              </div>

              {/* Customer detail */}
              {selectedCustomer && customerDetail && (
                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{(customerDetail.name || customerDetail.email || "?")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium font-sans">{customerDetail.name || (language === "pt" ? "Sem nome" : "No name")}</div>
                      <div className="text-sm text-muted-foreground font-sans flex items-center gap-1">
                        <Mail className="h-3 w-3" />{customerDetail.email || "—"}
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="ml-auto text-muted-foreground hover:text-foreground text-xs font-sans">✕</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: language === "pt" ? "Plano" : "Plan", value: customerDetail.plan, icon: Crown },
                      { label: "XP", value: customerDetail.xp, icon: Zap },
                      { label: language === "pt" ? "Nível" : "Level", value: customerDetail.level, icon: UserCheck },
                      { label: language === "pt" ? "Simulados" : "Exams", value: customerDetail.totalExams, icon: BookOpen },
                      { label: language === "pt" ? "Taxa Acerto" : "Accuracy", value: `${customerDetail.accuracy ?? 0}%`, icon: Zap },
                      { label: language === "pt" ? "Membro desde" : "Member since", value: new Date(customerDetail.createdAt).toLocaleDateString(), icon: Calendar },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-background rounded-lg border border-border/30">
                        <div className="text-xs text-muted-foreground font-sans mb-1">{item.label}</div>
                        <div className="font-medium font-sans text-sm">{String(item.value)}</div>
                      </div>
                    ))}
                  </div>

                  {customerDetail.trialEndsAt && (
                    <div className="text-xs text-muted-foreground font-sans p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="font-medium text-primary">{language === "pt" ? "Trial expira:" : "Trial expires:"}</span>{" "}
                      {new Date(customerDetail.trialEndsAt).toLocaleDateString()}
                    </div>
                  )}
                  {customerDetail.premiumEndsAt && (
                    <div className="text-xs text-muted-foreground font-sans p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                      <span className="font-medium text-yellow-400">{language === "pt" ? "Premium expira:" : "Premium expires:"}</span>{" "}
                      {new Date(customerDetail.premiumEndsAt).toLocaleDateString()}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/30">
                    <div className="text-xs font-medium font-sans mb-2">{language === "pt" ? "Alterar Plano" : "Change Plan"}</div>
                    <div className="flex gap-2">
                      {["free", "trial", "premium"].map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={customerDetail.plan === p ? "default" : "outline"}
                          className="flex-1 font-sans text-xs h-8"
                          disabled={updateCustomerPlan.isPending}
                          onClick={async () => {
                            try {
                              await updateCustomerPlan.mutateAsync({ userId: selectedCustomer!, plan: p as any });
                              toast.success(language === "pt" ? "Plano atualizado!" : "Plan updated!");
                            } catch (err: any) { toast.error(err.message); }
                          }}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Discipline Dialog */}
      <Dialog open={showAddDiscipline} onOpenChange={setShowAddDiscipline}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Nova Disciplina" : "New Discipline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Slug (ex: pharmacology)" value={newDiscipline.slug} onChange={(e) => setNewDiscipline((p) => ({ ...p, slug: e.target.value }))} className="font-sans bg-background" />
            <Input placeholder="Nome PT" value={newDiscipline.namePt} onChange={(e) => setNewDiscipline((p) => ({ ...p, namePt: e.target.value }))} className="font-sans bg-background" />
            <Input placeholder="Name EN" value={newDiscipline.nameEn} onChange={(e) => setNewDiscipline((p) => ({ ...p, nameEn: e.target.value }))} className="font-sans bg-background" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddDiscipline(false)} className="flex-1 font-sans">{t("cancel")}</Button>
              <Button onClick={handleAddDiscipline} disabled={createDiscipline.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                {createDiscipline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Novo Assunto" : "New Subject"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newSubject.disciplineId} onValueChange={(v) => setNewSubject((p) => ({ ...p, disciplineId: v }))}>
              <SelectTrigger className="bg-background font-sans"><SelectValue placeholder={t("exam_discipline")} /></SelectTrigger>
              <SelectContent>
                {disciplines?.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Slug" value={newSubject.slug} onChange={(e) => setNewSubject((p) => ({ ...p, slug: e.target.value }))} className="font-sans bg-background" />
            <Input placeholder="Nome PT" value={newSubject.namePt} onChange={(e) => setNewSubject((p) => ({ ...p, namePt: e.target.value }))} className="font-sans bg-background" />
            <Input placeholder="Name EN" value={newSubject.nameEn} onChange={(e) => setNewSubject((p) => ({ ...p, nameEn: e.target.value }))} className="font-sans bg-background" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddSubject(false)} className="flex-1 font-sans">{t("cancel")}</Button>
              <Button onClick={handleAddSubject} disabled={createSubject.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                {createSubject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAiGen} onOpenChange={(o) => { setShowAiGen(o); if (!o) setAiGenResult(null); }}>
        <DialogContent className="bg-card border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("admin_generate_ai")}</DialogTitle>
          </DialogHeader>
          {!aiGenResult ? (
            <div className="space-y-3">
              <Select value={aiGenConfig.disciplineId} onValueChange={(v) => setAiGenConfig((p) => ({ ...p, disciplineId: v }))}>
                <SelectTrigger className="bg-background font-sans"><SelectValue placeholder={t("exam_discipline")} /></SelectTrigger>
                <SelectContent>
                  {disciplines?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aiGenConfig.difficulty} onValueChange={(v) => setAiGenConfig((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger className="bg-background font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t("exam_easy")}</SelectItem>
                  <SelectItem value="medium">{t("exam_medium")}</SelectItem>
                  <SelectItem value="hard">{t("exam_hard")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={language === "pt" ? "Tópico específico (opcional)" : "Specific topic (optional)"}
                value={aiGenConfig.topic}
                onChange={(e) => setAiGenConfig((p) => ({ ...p, topic: e.target.value }))}
                className="font-sans bg-background"
              />
              <Button
                onClick={handleAiGenerate}
                disabled={generateAi.isPending}
                className="w-full bg-primary text-primary-foreground font-sans gap-2"
              >
                {generateAi.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {language === "pt" ? "Gerar Questão" : "Generate Question"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-accent/30 rounded-lg">
                <p className="text-sm font-sans font-medium mb-2">{aiGenResult.textPt}</p>
                {aiGenResult.options.map((o: any) => (
                  <div key={o.id} className={`text-xs font-sans p-2 rounded mb-1 ${o.id === aiGenResult.correctOption ? "bg-green-500/20 text-green-300" : "text-muted-foreground"}`}>
                    {o.id}) {o.textPt} {o.id === aiGenResult.correctOption && "✓"}
                  </div>
                ))}
              </div>
              {aiGenResult.explanationPt && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground font-sans">{aiGenResult.explanationPt}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiGenResult(null)} className="flex-1 font-sans">
                  {language === "pt" ? "Gerar Outra" : "Generate Another"}
                </Button>
                <Button onClick={handleSaveAiQuestion} disabled={createQuestion.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                  {createQuestion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Nova Questão" : "New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              placeholder="Texto PT *"
              value={newQuestion.textPt}
              onChange={(e) => setNewQuestion((p) => ({ ...p, textPt: e.target.value }))}
              className="w-full h-20 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder="Text EN"
              value={newQuestion.textEn}
              onChange={(e) => setNewQuestion((p) => ({ ...p, textEn: e.target.value }))}
              className="w-full h-20 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={newQuestion.disciplineId} onValueChange={(v) => setNewQuestion((p) => ({ ...p, disciplineId: v }))}>
                <SelectTrigger className="bg-background font-sans"><SelectValue placeholder={t("exam_discipline")} /></SelectTrigger>
                <SelectContent>
                  {disciplines?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={newQuestion.difficulty} onValueChange={(v) => setNewQuestion((p) => ({ ...p, difficulty: v }))}>
                <SelectTrigger className="bg-background font-sans"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t("exam_easy")}</SelectItem>
                  <SelectItem value="medium">{t("exam_medium")}</SelectItem>
                  <SelectItem value="hard">{t("exam_hard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Opção A PT *" value={newQuestion.optA} onChange={(e) => setNewQuestion((p) => ({ ...p, optA: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Option A EN" value={newQuestion.optAEn} onChange={(e) => setNewQuestion((p) => ({ ...p, optAEn: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Opção B PT *" value={newQuestion.optB} onChange={(e) => setNewQuestion((p) => ({ ...p, optB: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Option B EN" value={newQuestion.optBEn} onChange={(e) => setNewQuestion((p) => ({ ...p, optBEn: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Opção C PT *" value={newQuestion.optC} onChange={(e) => setNewQuestion((p) => ({ ...p, optC: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Option C EN" value={newQuestion.optCEn} onChange={(e) => setNewQuestion((p) => ({ ...p, optCEn: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Opção D PT *" value={newQuestion.optD} onChange={(e) => setNewQuestion((p) => ({ ...p, optD: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder="Option D EN" value={newQuestion.optDEn} onChange={(e) => setNewQuestion((p) => ({ ...p, optDEn: e.target.value }))} className="font-sans bg-background" />
            </div>
            <Select value={newQuestion.correctOption} onValueChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}>
              <SelectTrigger className="bg-background font-sans"><SelectValue placeholder={language === "pt" ? "Resposta Correta" : "Correct Answer"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
            <textarea
              placeholder={language === "pt" ? "Explicação PT" : "Explanation PT"}
              value={newQuestion.explanationPt}
              onChange={(e) => setNewQuestion((p) => ({ ...p, explanationPt: e.target.value }))}
              className="w-full h-16 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={language === "pt" ? "Ano (opcional)" : "Year (optional)"} value={newQuestion.year} onChange={(e) => setNewQuestion((p) => ({ ...p, year: e.target.value }))} className="font-sans bg-background" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddQuestion(false)} className="flex-1 font-sans">{t("cancel")}</Button>
              <Button onClick={handleAddQuestion} disabled={createQuestion.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                {createQuestion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
