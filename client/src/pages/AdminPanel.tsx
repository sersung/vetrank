import { useAuth } from "@/_core/hooks/useAuth";
import { QuestionFilters, type QuestionFilterState, EMPTY_FILTERS } from "@/components/QuestionFilters";
import { QuestionImport } from "@/components/QuestionImport";
import { ImportGuide } from "@/components/ImportGuide";
import { AIQuestionExtractor, type AIExtractedQuestion } from "@/components/AIQuestionExtractor";
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
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  Crown,
  Database,
  Edit,
  FileJson,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ASSERTION_REASON_OPTIONS,
  AssertionReasonSection,
  ComplexMCSection,
  MatchingSection,
  TrueFalseSection,
  OrderingSection,
  ClozeSection,
  MediaSection,
  MultipleChoiceOptions,
  QUESTION_TYPE_LABELS,
  type QuestionType,
  type FormatData,
  type ComplexMCItem,
  type MatchingPair,
  type TrueFalseStatement,
  type OrderingStep,
} from "@/components/QuestionFormats";
import { MODEL_OPTIONS, getDbTypeForModel } from "@shared/questionModels";
import { QuestionImageUpload } from "@/components/QuestionImageUpload";

export default function AdminPanel() {
  const t = useT();
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: disciplines, refetch: refetchDisciplines } = trpc.admin.disciplines.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: subjects, refetch: refetchSubjects } = trpc.admin.subjects.useQuery(undefined, { enabled: user?.role === "admin" });
  const [adminQFilters, setAdminQFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [adminQApplied, setAdminQApplied] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [adminQPage, setAdminQPage] = useState(1);
  const { data: questions, refetch: refetchQuestions } = trpc.questions.list.useQuery(
    {
      ...adminQApplied,
      difficulty: adminQApplied.difficulty as any,
      escolaridade: adminQApplied.escolaridade as any,
      questionType: adminQApplied.questionType as any,
      status: adminQApplied.status as any,
      orderBy: adminQApplied.orderBy as any,
      myAnswers: adminQApplied.myAnswers as any,
      page: adminQPage,
      limit: 30,
    },
    { enabled: user?.role === "admin" }
  );
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

  // Email state
  const [newsletterSubject, setNewsletterSubject] = useState("");
  const [newsletterBody, setNewsletterBody] = useState("");
  const [newsletterTarget, setNewsletterTarget] = useState<"all" | "free" | "trial" | "premium">("all");
  const { data: expiryPreview, refetch: refetchExpiryPreview } = trpc.notifications.previewExpiryTargets.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );
  const sendNewsletter = trpc.notifications.sendNewsletter.useMutation();
  const sendExpiryEmails = trpc.notifications.sendExpiryEmails.useMutation();

  // Bulk upload state
  const [bulkJson, setBulkJson] = useState("");
  const [bulkPreview, setBulkPreview] = useState<any[] | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const bulkJsonRef = useRef<HTMLInputElement>(null);
  const bulkImport = trpc.questions.bulkImport.useMutation();

  // Validation state
  const [validationFilter, setValidationFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [assignProfessorId, setAssignProfessorId] = useState<string>("");
  const [assignDisciplineId, setAssignDisciplineId] = useState<string>("");
  const [selectedForAssignment, setSelectedForAssignment] = useState<number[]>([]);
  const isAdmin = user?.role === "admin";

  // Stabilize query inputs with useMemo to prevent infinite re-fetches
  const validationListInput = useMemo(() => ({
    questionType: "multiple_choice" as const,
    disciplineId: (assignDisciplineId && assignDisciplineId !== "all") ? Number(assignDisciplineId) : undefined,
    isValidated: false,
    page: 1,
    pageSize: 50,
  }), [assignDisciplineId]);

  const allAssignmentsInput = useMemo(() => ({
    status: validationFilter as "all" | "pending" | "approved" | "rejected",
    page: 1,
    pageSize: 30,
  }), [validationFilter]);

  const { data: validationStats, refetch: refetchValidationStats } = trpc.validation.getValidationStats.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: professors } = trpc.validation.listProfessors.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: questionsForValidation, refetch: refetchValidationList } = trpc.validation.listForValidation.useQuery(
    validationListInput,
    { enabled: isAdmin }
  );
  const { data: allAssignments, refetch: refetchAllAssignments } = trpc.validation.listAllAssignments.useQuery(
    allAssignmentsInput,
    { enabled: isAdmin }
  );
  const createAssignment = trpc.validation.createAssignment.useMutation();
  const validateQuestion = trpc.validation.validateQuestion.useMutation();

  const handleCreateAssignment = async () => {
    if (!assignProfessorId || selectedForAssignment.length === 0) {
      toast.error("Selecione um professor e ao menos uma questão");
      return;
    }
    try {
      const result = await createAssignment.mutateAsync({
        assignedTo: Number(assignProfessorId),
        questionIds: selectedForAssignment,
        questionType: "multiple_choice",
      });
      toast.success(`${result.count} questão(ões) atribuída(s) com sucesso`);
      setSelectedForAssignment([]);
      await refetchAllAssignments();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const seedMutation = trpc.admin.seed.useMutation();
  const createDiscipline = trpc.admin.createDiscipline.useMutation();
  const createSubject = trpc.admin.createSubject.useMutation();
  const deleteQuestion = trpc.questions.delete.useMutation();
  const generateAi = trpc.ai.generateQuestion.useMutation();
  const importCsv = trpc.questions.importCsv.useMutation();
  const createQuestion = trpc.questions.create.useMutation();
  const updateQuestionMutation = trpc.questions.update.useMutation();

  // Edit question state
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
  const { data: editQuestionData, isLoading: editLoading } = trpc.questions.byId.useQuery(
    { id: editQuestionId! },
    { enabled: !!editQuestionId }
  );
  const [editForm, setEditForm] = useState<any>(null);

  // Sync editForm when editQuestionData loads
  const prevEditId = useRef<number | null>(null);
  if (editQuestionData && editQuestionId && prevEditId.current !== editQuestionId) {
    prevEditId.current = editQuestionId;
    setEditForm({
      textPt: editQuestionData.textPt ?? "",
      textEn: editQuestionData.textEn ?? "",
      disciplineId: String(editQuestionData.disciplineId),
      subjectId: editQuestionData.subjectId ? String(editQuestionData.subjectId) : "",
      difficulty: editQuestionData.difficulty,
      year: editQuestionData.year ? String(editQuestionData.year) : "",
      isPremium: editQuestionData.isPremium,
      questionType: editQuestionData.questionType as QuestionType,
      modelId: (editQuestionData as any).modelId ?? "",
      grupoId: (editQuestionData as any).grupoId ?? "",
      posicaoBloco: (editQuestionData as any).posicaoBloco ? String((editQuestionData as any).posicaoBloco) : "",
      subjectTag: editQuestionData.subjectTag ?? "",
      author: editQuestionData.author ?? "",
      banca: (editQuestionData as any).banca ?? "",
      instituicao: (editQuestionData as any).instituicao ?? "",
      cargo: (editQuestionData as any).cargo ?? "",
      carreira: (editQuestionData as any).carreira ?? "",
      areaFormacao: (editQuestionData as any).areaFormacao ?? "",
      escolaridade: (editQuestionData as any).escolaridade ?? "",
      isAnulada: (editQuestionData as any).isAnulada ?? false,
      isDesatualizada: (editQuestionData as any).isDesatualizada ?? false,
      correctOption: editQuestionData.correctOption,
      explanationPt: editQuestionData.explanationPt ?? "",
      explanationEn: editQuestionData.explanationEn ?? "",
      assertion1: editQuestionData.assertion1 ?? "",
      assertion2: editQuestionData.assertion2 ?? "",
      options: (editQuestionData.options as any[]) ?? [{id:"A",textPt:""},{id:"B",textPt:""},{id:"C",textPt:""},{id:"D",textPt:""},{id:"E",textPt:""}],
      formatData: (editQuestionData.formatData as FormatData) ?? {} as FormatData,
    });
  }

  const handleOpenEdit = (id: number) => {
    setEditForm(null);
    prevEditId.current = null;
    setEditQuestionId(id);
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editQuestionId) return;
    try {
      await updateQuestionMutation.mutateAsync({
        id: editQuestionId,
        textPt: editForm.textPt,
        textEn: editForm.textEn || undefined,
        disciplineId: editForm.disciplineId ? parseInt(editForm.disciplineId) : undefined,
        subjectId: editForm.subjectId ? parseInt(editForm.subjectId) : undefined,
        difficulty: editForm.difficulty,
        year: editForm.year ? parseInt(editForm.year) : undefined,
        isPremium: editForm.isPremium,
        questionType: editForm.questionType,
        modelId: editForm.modelId || undefined,
        grupoId: editForm.grupoId || undefined,
        posicaoBloco: editForm.posicaoBloco ? parseInt(editForm.posicaoBloco) : undefined,
        subjectTag: editForm.subjectTag || undefined,
        author: editForm.author || undefined,
        banca: editForm.banca || undefined,
        instituicao: editForm.instituicao || undefined,
        cargo: editForm.cargo || undefined,
        carreira: editForm.carreira || undefined,
        areaFormacao: editForm.areaFormacao || undefined,
        escolaridade: editForm.escolaridade || undefined,
        isAnulada: editForm.isAnulada,
        isDesatualizada: editForm.isDesatualizada,
        correctOption: editForm.correctOption,
        explanationPt: editForm.explanationPt || undefined,
        explanationEn: editForm.explanationEn || undefined,
        assertion1: editForm.assertion1 || undefined,
        assertion2: editForm.assertion2 || undefined,
        options: editForm.options,
        formatData: editForm.formatData,
      });
      toast.success(language === "pt" ? "Questão atualizada!" : "Question updated!");
      setEditQuestionId(null);
      setEditForm(null);
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [showAddDiscipline, setShowAddDiscipline] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAiGen, setShowAiGen] = useState(false);
  const [newDiscipline, setNewDiscipline] = useState({ slug: "", namePt: "", nameEn: "" });
  const [newSubject, setNewSubject] = useState({ disciplineId: "", slug: "", namePt: "", nameEn: "" });
  const [aiGenConfig, setAiGenConfig] = useState({ disciplineId: "", difficulty: "medium", topic: "" });
  const [aiGenResult, setAiGenResult] = useState<any>(null);
  const defaultOptions = [
    { id: "A", textPt: "", textEn: "" },
    { id: "B", textPt: "", textEn: "" },
    { id: "C", textPt: "", textEn: "" },
    { id: "D", textPt: "", textEn: "" },
    { id: "E", textPt: "", textEn: "" },
  ];
  const [newQuestion, setNewQuestion] = useState({
    textPt: "", textEn: "", disciplineId: "", subjectId: "",
    difficulty: "medium", year: "", isPremium: false,
    questionType: "multiple_choice" as QuestionType,
    modelId: "" as string,
    grupoId: "", posicaoBloco: "",
    subjectTag: "", author: "", banca: "", instituicao: "",
    cargo: "", carreira: "", areaFormacao: "", escolaridade: "",
    correctOption: "A", explanationPt: "", explanationEn: "",
    assertion1: "", assertion2: "",
    isAnulada: false, isDesatualizada: false,
    imageUrl: "" as string,
    hasImage: false as boolean,
    // format-specific
    options: defaultOptions as Array<{ id: string; textPt: string; textEn?: string }>,
    formatData: {} as FormatData,
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
      toast.success(language === "pt" ? "Grande Área criada!" : "Major Area created!");
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
      toast.success(language === "pt" ? "Disciplina criada!" : "Discipline created!");
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
      toast.error(language === "pt" ? "Selecione uma grande área" : "Select a major area");
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

  const resetNewQuestion = () => setNewQuestion({
    textPt: "", textEn: "", disciplineId: "", subjectId: "",
    difficulty: "medium", year: "", isPremium: false,
    questionType: "multiple_choice" as QuestionType,
    modelId: "", grupoId: "", posicaoBloco: "",
    subjectTag: "", author: "", banca: "", instituicao: "",
    cargo: "", carreira: "", areaFormacao: "", escolaridade: "",
    correctOption: "A", explanationPt: "", explanationEn: "",
    assertion1: "", assertion2: "",
    isAnulada: false, isDesatualizada: false,
    imageUrl: "", hasImage: false,
    options: [
      { id: "A", textPt: "", textEn: "" },
      { id: "B", textPt: "", textEn: "" },
      { id: "C", textPt: "", textEn: "" },
      { id: "D", textPt: "", textEn: "" },
      { id: "E", textPt: "", textEn: "" },
    ],
    formatData: {} as FormatData,
  });

  const handleAddQuestion = async () => {
    if (!newQuestion.textPt || !newQuestion.disciplineId) {
      toast.error(language === "pt" ? "Preencha os campos obrigatórios" : "Fill required fields");
      return;
    }
    try {
      const qType = newQuestion.questionType;
      // Determine options to submit
      let options: Array<{ id: string; textPt: string; textEn?: string }> = [];
      if (qType === "assertion_reason") {
        options = ASSERTION_REASON_OPTIONS.map(o => ({ id: o.id, textPt: o.textPt, textEn: o.textEn }));
      } else if (qType === "discursive") {
        options = [];
      } else {
        options = newQuestion.options.filter(o => o.textPt.trim());
        if (options.length < 2) {
          toast.error(language === "pt" ? "Preencha pelo menos 2 alternativas" : "Fill at least 2 options");
          return;
        }
      }

      // Build formatData for complex types
      let formatData: any = undefined;
      if (qType === "complex_multiple_choice" && newQuestion.formatData.items?.length) {
        formatData = { items: newQuestion.formatData.items };
      } else if (qType === "matching" && newQuestion.formatData.pairs?.length) {
        formatData = { pairs: newQuestion.formatData.pairs };
      } else if (qType === "true_false" && newQuestion.formatData.statements?.length) {
        formatData = { statements: newQuestion.formatData.statements };
      } else if (qType === "ordering" && newQuestion.formatData.steps?.length) {
        formatData = { steps: newQuestion.formatData.steps };
      } else if (["clinical_case", "image_analysis", "interpretation"].includes(qType)) {
        formatData = {
          imageUrl: newQuestion.formatData.imageUrl,
          caseText: newQuestion.formatData.caseText,
          tableData: newQuestion.formatData.tableData,
        };
      }

      await createQuestion.mutateAsync({
        textPt: newQuestion.textPt,
        textEn: newQuestion.textEn || undefined,
        disciplineId: parseInt(newQuestion.disciplineId),
        subjectId: newQuestion.subjectId ? parseInt(newQuestion.subjectId) : undefined,
        difficulty: newQuestion.difficulty as any,
        year: newQuestion.year ? parseInt(newQuestion.year) : undefined,
        isPremium: newQuestion.isPremium,
        questionType: qType,
        modelId: newQuestion.modelId || undefined,
        grupoId: newQuestion.grupoId || undefined,
        posicaoBloco: newQuestion.posicaoBloco ? parseInt(newQuestion.posicaoBloco) : undefined,
        subjectTag: newQuestion.subjectTag || undefined,
        author: newQuestion.author || undefined,
        banca: newQuestion.banca || undefined,
        instituicao: newQuestion.instituicao || undefined,
        cargo: newQuestion.cargo || undefined,
        carreira: newQuestion.carreira || undefined,
        areaFormacao: newQuestion.areaFormacao || undefined,
        escolaridade: (newQuestion.escolaridade || undefined) as any,
        isAnulada: newQuestion.isAnulada,
        isDesatualizada: newQuestion.isDesatualizada,
        imageUrl: newQuestion.imageUrl || undefined,
        options,
        correctOption: qType === "discursive" ? "N/A" : newQuestion.correctOption,
        explanationPt: newQuestion.explanationPt || undefined,
        explanationEn: newQuestion.explanationEn || undefined,
        assertion1: qType === "assertion_reason" ? newQuestion.assertion1 || undefined : undefined,
        assertion2: qType === "assertion_reason" ? newQuestion.assertion2 || undefined : undefined,
        formatData,
      });
      toast.success(language === "pt" ? "Questão criada!" : "Question created!");
      setShowAddQuestion(false);
      resetNewQuestion();
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

  // ─── Email handlers ────────────────────────────────────────────────────────
  const handleSendNewsletter = async () => {
    if (!newsletterSubject.trim() || !newsletterBody.trim()) {
      toast.error(language === "pt" ? "Preencha assunto e corpo do email" : "Fill in subject and body");
      return;
    }
    if (!confirm(language === "pt" ? `Enviar newsletter para todos os usuários (${newsletterTarget})? Esta ação não pode ser desfeita.` : `Send newsletter to all ${newsletterTarget} users? This cannot be undone.`)) return;
    try {
      const result = await sendNewsletter.mutateAsync({ subject: newsletterSubject, body: newsletterBody, targetPlan: newsletterTarget });
      toast.success(language === "pt" ? `Newsletter enviada! ${result.sent} enviados, ${result.failed} falhas.` : `Newsletter sent! ${result.sent} sent, ${result.failed} failed.`);
      setNewsletterSubject("");
      setNewsletterBody("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendExpiryEmails = async () => {
    if (!confirm(language === "pt" ? "Disparar emails de expiração agora?" : "Trigger expiry emails now?")) return;
    try {
      const result = await sendExpiryEmails.mutateAsync();
      toast.success(language === "pt" ? `Emails disparados! ${result.sent} enviados, ${result.failed} falhas.` : `Emails triggered! ${result.sent} sent, ${result.failed} failed.`);
      refetchExpiryPreview();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ─── Bulk upload handlers ──────────────────────────────────────────────────
  const parseBulkJson = (text: string) => {
    setBulkError("");
    setBulkPreview(null);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length === 0) { setBulkError(language === "pt" ? "Array vazio" : "Empty array"); return; }
      // Validate minimal required fields
      const invalid = arr.findIndex((q: any) => !q.textPt || !q.disciplineId || !q.options || !q.correctOption);
      if (invalid >= 0) {
        setBulkError(language === "pt" ? `Questão ${invalid + 1} está faltando campos obrigatórios (textPt, disciplineId, options, correctOption)` : `Question ${invalid + 1} is missing required fields (textPt, disciplineId, options, correctOption)`);
        return;
      }
      setBulkPreview(arr);
    } catch (e: any) {
      setBulkError(language === "pt" ? `JSON inválido: ${e.message}` : `Invalid JSON: ${e.message}`);
    }
  };

  const handleBulkJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setBulkJson(text);
    parseBulkJson(text);
    if (bulkJsonRef.current) bulkJsonRef.current.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && !file.name.endsWith(".csv")) {
      toast.error(language === "pt" ? "Apenas arquivos .json ou .csv são suportados" : "Only .json or .csv files are supported");
      return;
    }
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      setBulkJson(text);
      parseBulkJson(text);
    } else {
      // CSV drop → use existing importCsv
      try {
        const result = await importCsv.mutateAsync({ csv: text });
        toast.success(`${result.imported} ${language === "pt" ? "questões importadas!" : "questions imported!"}`);
        refetchQuestions();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  }, [language]);

  const handleBulkImport = async () => {
    if (!bulkPreview || bulkPreview.length === 0) return;
    try {
      const result = await bulkImport.mutateAsync({ questions: bulkPreview });
      toast.success(`${result.imported} ${language === "pt" ? "questões importadas!" : "questions imported!"}`);
      setBulkJson("");
      setBulkPreview(null);
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-1">{t("admin_title")}</h1>
            <p className="text-muted-foreground font-sans text-sm">
              {language === "pt" ? "Gerencie questões, grandes áreas e disciplinas" : "Manage questions, major areas, and disciplines"}
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
          <TabsList className="mb-6 bg-card border border-border/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="questions" className="font-sans">{t("admin_questions")}</TabsTrigger>
            <TabsTrigger value="disciplines" className="font-sans">{t("admin_disciplines")}</TabsTrigger>
            <TabsTrigger value="subjects" className="font-sans">{t("admin_subjects")}</TabsTrigger>
            <TabsTrigger value="customers" className="font-sans gap-1">
              <Users className="h-3.5 w-3.5" />
              {language === "pt" ? "Clientes" : "Customers"}
            </TabsTrigger>
            <TabsTrigger value="emails" className="font-sans gap-1">
              <Mail className="h-3.5 w-3.5" />
              {language === "pt" ? "Emails" : "Emails"}
            </TabsTrigger>
            <TabsTrigger value="importar" className="font-sans gap-1">
              <FileJson className="h-3.5 w-3.5" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="validacao" className="font-sans gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              Validação
            </TabsTrigger>
            <TabsTrigger value="planos" className="font-sans gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              {language === "pt" ? "Planos" : "Plans"}
            </TabsTrigger>
            <TabsTrigger value="assinantes" className="font-sans gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              {language === "pt" ? "Assinantes" : "Subscribers"}
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
              <strong>CSV format (4 opções):</strong> textPt,textEn,disciplineId,difficulty,optA,optB,optC,optD,correctOption,explanationPt,year,isPremium
              <br />
              <span className="text-primary">Para 5 opções (A-E) use a aba <strong>Upload</strong> com JSON.</span>
            </div>

            {/* Admin question filters */}
            <div className="bg-card border border-border/50 rounded-xl p-4 mb-4">
              <QuestionFilters
                filters={adminQFilters}
                onChange={setAdminQFilters}
                onApply={() => { setAdminQApplied(adminQFilters); setAdminQPage(1); }}
                showAdminFields={true}
              />
            </div>

            {questions && (
              <p className="text-xs text-muted-foreground font-sans mb-2">
                {questions.total} {language === "pt" ? "questão(ões) encontrada(s)" : "question(s) found"}
              </p>
            )}

            <div className="space-y-2">
              {questions?.questions.map((q, i) => {
                const diffColor =
                  q.difficulty === "very_easy" ? "bg-sky-500/20 text-sky-400 border-sky-500/30" :
                  q.difficulty === "easy" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  q.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                  q.difficulty === "hard" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                  "bg-purple-500/20 text-purple-400 border-purple-500/30";
                const diffPt: Record<string, string> = {
                  very_easy: "Muito Fácil", easy: "Fácil", medium: "Médio", hard: "Difícil", very_hard: "Muito Difícil"
                };
                return (
                  <div key={q.id} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl">
                    <span className="text-xs text-muted-foreground font-sans mt-0.5 w-6 shrink-0">
                      {(adminQPage - 1) * 30 + i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans line-clamp-2">{q.textPt}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge className={`text-xs font-sans border ${diffColor}`}>{diffPt[q.difficulty] ?? q.difficulty}</Badge>
                        {q.banca && <Badge variant="outline" className="text-xs font-sans">{q.banca}</Badge>}
                        {q.year && <Badge variant="outline" className="text-xs font-sans">{q.year}</Badge>}
                        {q.isValidated
                          ? <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Validada</Badge>
                          : <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>
                        }
                        {q.isAnulada && <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">Anulada</Badge>}
                        {q.isDesatualizada && <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">Desatualizada</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleOpenEdit(q.id)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                        title={language === "pt" ? "Editar questão" : "Edit question"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!questions?.questions.length && (
                <div className="text-center py-10 text-muted-foreground font-sans">
                  {language === "pt" ? "Nenhuma questão encontrada com os filtros selecionados." : "No questions found with the selected filters."}
                </div>
              )}
            </div>

            {/* Admin pagination */}
            {questions && questions.total > 30 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" size="sm" disabled={adminQPage === 1}
                  onClick={() => setAdminQPage(p => Math.max(1, p - 1))}>← Anterior</Button>
                <span className="text-sm text-muted-foreground">
                  {adminQPage} / {Math.ceil(questions.total / 30)}
                </span>
                <Button variant="outline" size="sm" disabled={adminQPage >= Math.ceil(questions.total / 30)}
                  onClick={() => setAdminQPage(p => p + 1)}>Próxima →</Button>
              </div>
            )}
          </TabsContent>

          {/* Upload tab — enhanced bulk import */}
          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border/50 bg-card hover:border-primary/40 hover:bg-primary/3"
                }`}
                onClick={() => bulkJsonRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-sans font-medium text-sm mb-1">
                  {language === "pt" ? "Arraste um arquivo JSON ou CSV aqui" : "Drag a JSON or CSV file here"}
                </p>
                <p className="text-xs text-muted-foreground font-sans">
                  {language === "pt" ? "ou clique para selecionar" : "or click to select"}
                </p>
                <input ref={bulkJsonRef} type="file" accept=".json,.csv" className="hidden" onChange={handleBulkJsonFile} />
              </div>

              {/* JSON format documentation */}
              <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="h-4 w-4 text-primary" />
                  <span className="font-sans font-medium text-sm">{language === "pt" ? "Formato JSON (suporta 5 opções A-E)" : "JSON Format (supports 5 options A-E)"}</span>
                </div>
                <pre className="text-xs font-mono bg-background rounded-lg p-3 border border-border/30 overflow-x-auto text-muted-foreground whitespace-pre">{`[
  {
    "textPt": "Qual é o principal agente causador de...",
    "textEn": "What is the main causative agent of...",
    "disciplineId": 1,
    "subjectId": 3,
    "difficulty": "medium",
    "year": 2023,
    "isPremium": false,
    "options": [
      { "id": "A", "textPt": "Opção A", "textEn": "Option A" },
      { "id": "B", "textPt": "Opção B", "textEn": "Option B" },
      { "id": "C", "textPt": "Opção C", "textEn": "Option C" },
      { "id": "D", "textPt": "Opção D", "textEn": "Option D" },
      { "id": "E", "textPt": "Opção E", "textEn": "Option E" }
    ],
    "correctOption": "C",
    "explanationPt": "Explicação detalhada...",
    "explanationEn": "Detailed explanation..."
  }
]`}</pre>
              </div>

              {/* JSON text area */}
              <div>
                <label className="text-xs font-sans font-medium text-muted-foreground mb-2 block">
                  {language === "pt" ? "Ou cole o JSON diretamente:" : "Or paste JSON directly:"}
                </label>
                <textarea
                  value={bulkJson}
                  onChange={(e) => {
                    setBulkJson(e.target.value);
                    parseBulkJson(e.target.value);
                  }}
                  placeholder='[{ "textPt": "...", "disciplineId": 1, ... }]'
                  className="w-full h-32 p-3 rounded-lg bg-background border border-border/50 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Error */}
              {bulkError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive font-sans">
                  {bulkError}
                </div>
              )}

              {/* Preview */}
              {bulkPreview && bulkPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-sans font-medium">
                      {language === "pt" ? `Pré-visualização: ${bulkPreview.length} questão(ões)` : `Preview: ${bulkPreview.length} question(s)`}
                    </span>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground gap-2 font-sans"
                      onClick={handleBulkImport}
                      disabled={bulkImport.isPending}
                    >
                      {bulkImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {language === "pt" ? `Importar ${bulkPreview.length} questão(ões)` : `Import ${bulkPreview.length} question(s)`}
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkPreview.slice(0, 10).map((q: any, i: number) => (
                      <div key={i} className="p-3 bg-card border border-border/50 rounded-lg">
                        <p className="text-xs font-sans font-medium line-clamp-2">{q.textPt}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs font-sans">disciplineId: {q.disciplineId}</Badge>
                          <Badge variant="outline" className="text-xs font-sans">{q.difficulty || "medium"}</Badge>
                          <Badge variant="outline" className="text-xs font-sans">{q.options?.length || 0} opções</Badge>
                          <Badge className="text-xs font-sans bg-green-500/20 text-green-400 border-green-500/30 border">✓ {q.correctOption}</Badge>
                        </div>
                      </div>
                    ))}
                    {bulkPreview.length > 10 && (
                      <p className="text-xs text-muted-foreground font-sans text-center py-2">
                        {language === "pt" ? `... e mais ${bulkPreview.length - 10} questão(ões)` : `... and ${bulkPreview.length - 10} more question(s)`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Import Guide */}
              <ImportGuide />
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
                  {language === "pt" ? "Nenhuma grande área. Clique em 'Inicializar Dados'." : "No major areas. Click 'Initialize Data'."}
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
                  {language === "pt" ? "Nenhuma disciplina cadastrada." : "No disciplines yet."}
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

          {/* Emails tab */}
          <TabsContent value="emails">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Newsletter section */}
              <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <Send className="h-4 w-4 text-primary" />
                  <h3 className="font-sans font-semibold text-sm">{language === "pt" ? "Enviar Newsletter" : "Send Newsletter"}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Destinatários" : "Recipients"}</label>
                    <Select value={newsletterTarget} onValueChange={(v) => setNewsletterTarget(v as any)}>
                      <SelectTrigger className="bg-background font-sans h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "pt" ? "Todos os usuários" : "All users"}</SelectItem>
                        <SelectItem value="free">{language === "pt" ? "Plano Free" : "Free plan"}</SelectItem>
                        <SelectItem value="trial">{language === "pt" ? "Em Trial" : "On Trial"}</SelectItem>
                        <SelectItem value="premium">{language === "pt" ? "Premium" : "Premium"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Assunto do Email" : "Email Subject"}</label>
                    <Input
                      placeholder={language === "pt" ? "Ex: Novidades do VetRank — Maio 2026" : "Ex: VetRank Updates — May 2026"}
                      value={newsletterSubject}
                      onChange={(e) => setNewsletterSubject(e.target.value)}
                      className="font-sans bg-background h-9 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Corpo do email (HTML ou texto)" : "Email body (HTML or text)"}</label>
                    <textarea
                      placeholder={language === "pt" ? "Escreva o conteúdo do email aqui..." : "Write email content here..."}
                      value={newsletterBody}
                      onChange={(e) => setNewsletterBody(e.target.value)}
                      className="w-full h-40 p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <Button
                    className="w-full bg-primary text-primary-foreground gap-2 font-sans"
                    onClick={handleSendNewsletter}
                    disabled={sendNewsletter.isPending || !newsletterSubject.trim() || !newsletterBody.trim()}
                  >
                    {sendNewsletter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {language === "pt" ? "Enviar Newsletter" : "Send Newsletter"}
                  </Button>
                </div>
              </div>

              {/* Expiry notifications section */}
              <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <Mail className="h-4 w-4 text-yellow-400" />
                  <h3 className="font-sans font-semibold text-sm">{language === "pt" ? "Notificações de Expiração" : "Expiry Notifications"}</h3>
                </div>

                {/* Preview counts */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-sans">
                    {language === "pt" ? "Usuários que receberiam emails agora:" : "Users who would receive emails now:"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: language === "pt" ? "Trial expira em 3 dias" : "Trial expiring in 3 days",
                        count: expiryPreview?.trialExpiring3Days?.length ?? 0,
                        color: "text-primary",
                      },
                      {
                        label: language === "pt" ? "Trial expira em 1 dia" : "Trial expiring in 1 day",
                        count: expiryPreview?.trialExpiring1Day?.length ?? 0,
                        color: "text-orange-400",
                      },
                      {
                        label: language === "pt" ? "Premium expira em 7 dias" : "Premium expiring in 7 days",
                        count: expiryPreview?.premiumExpiring7Days?.length ?? 0,
                        color: "text-yellow-400",
                      },
                      {
                        label: language === "pt" ? "Premium expira em 1 dia" : "Premium expiring in 1 day",
                        count: expiryPreview?.premiumExpiring1Day?.length ?? 0,
                        color: "text-red-400",
                      },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-background rounded-lg border border-border/30">
                        <div className={`font-serif text-2xl font-bold ${item.color}`}>{item.count}</div>
                        <div className="text-xs text-muted-foreground font-sans mt-0.5 leading-tight">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-muted-foreground font-sans">
                  {language === "pt"
                    ? "Os emails de expiração são disparados automaticamente todo dia às 09:00. Use o botão abaixo para disparar manualmente."
                    : "Expiry emails are automatically sent every day at 09:00. Use the button below to trigger them manually."}
                </div>

                <Button
                  className="w-full bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 gap-2 font-sans"
                  variant="outline"
                  onClick={handleSendExpiryEmails}
                  disabled={sendExpiryEmails.isPending}
                >
                  {sendExpiryEmails.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {language === "pt" ? "Disparar Emails de Expiração Agora" : "Trigger Expiry Emails Now"}
                </Button>
              </div>
            </div>
          </TabsContent>
          {/* Importar tab */}
          <TabsContent value="importar">
            <ImportTab onImportComplete={() => refetchQuestions()} />
          </TabsContent>

          {/* Validação tab */}
          <TabsContent value="validacao">
            <div className="space-y-6">
              {/* Stats cards */}
              {validationStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-primary">{validationStats.multipleChoice.total}</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5">Total MC</div>
                  </div>
                  <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-green-400">{validationStats.multipleChoice.validated}</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5">Validadas</div>
                  </div>
                  <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-yellow-400">{validationStats.multipleChoice.pending}</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5">Pendentes</div>
                  </div>
                  <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-cyan-400">{validationStats.byProfessor.length}</div>
                    <div className="text-xs text-muted-foreground font-sans mt-0.5">Professores ativos</div>
                  </div>
                </div>
              )}

              {/* Assign questions to professor */}
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <h3 className="font-serif text-lg font-bold mb-4">Atribuir Questões para Validação</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={assignProfessorId} onValueChange={setAssignProfessorId}>
                    <SelectTrigger className="w-52 font-sans">
                      <SelectValue placeholder="Selecionar professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {professors?.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name ?? p.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={assignDisciplineId} onValueChange={setAssignDisciplineId}>
                    <SelectTrigger className="w-52 font-sans">
                      <SelectValue placeholder="Filtrar por grande área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as grandes áreas</SelectItem>
                      {disciplines?.map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.namePt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleCreateAssignment}
                    disabled={createAssignment.isPending || selectedForAssignment.length === 0 || !assignProfessorId}
                    className="bg-primary text-primary-foreground font-sans"
                  >
                    {createAssignment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
                    Atribuir {selectedForAssignment.length > 0 ? `(${selectedForAssignment.length})` : ""}
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {questionsForValidation?.rows.map(q => (
                    <label key={q.id} className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-primary"
                        checked={selectedForAssignment.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedForAssignment(prev => [...prev, q.id]);
                          else setSelectedForAssignment(prev => prev.filter(id => id !== q.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans line-clamp-1">{q.textPt}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Pendente</Badge>
                        </div>
                      </div>
                    </label>
                  ))}
                  {questionsForValidation?.rows.length === 0 && (
                    <p className="text-sm text-muted-foreground font-sans text-center py-4">Nenhuma questão pendente de validação</p>
                  )}
                </div>
              </div>

              {/* Assignments monitoring */}
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg font-bold">Monitoramento de Atribuições</h3>
                  <div className="flex gap-2">
                    {(["all", "pending", "approved", "rejected"] as const).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={validationFilter === s ? "default" : "outline"}
                        className="font-sans text-xs"
                        onClick={() => setValidationFilter(s)}
                      >
                        {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allAssignments?.rows.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-sans">Questão #{a.questionId} → Professor #{a.assignedTo}</p>
                        {a.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{a.notes}</p>}
                      </div>
                      <Badge className={`text-xs font-sans ${
                        a.status === "approved" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                        a.status === "rejected" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      }`}>
                        {a.status === "approved" ? <CheckCircle className="h-3 w-3 mr-1" /> : a.status === "rejected" ? <XCircle className="h-3 w-3 mr-1" /> : null}
                        {a.status === "approved" ? "Aprovado" : a.status === "rejected" ? "Rejeitado" : "Pendente"}
                      </Badge>
                    </div>
                  ))}
                  {allAssignments?.rows.length === 0 && (
                    <p className="text-sm text-muted-foreground font-sans text-center py-4">Nenhuma atribuição encontrada</p>
                  )}
                </div>
              </div>

              {/* Per-professor stats */}
              {validationStats?.byProfessor && validationStats.byProfessor.length > 0 && (
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h3 className="font-serif text-lg font-bold mb-4">Desempenho por Professor</h3>
                  <div className="space-y-3">
                    {validationStats.byProfessor.map(p => (
                      <div key={p.professorId} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium font-sans">{p.professorName}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground font-sans">
                            <span className="text-green-400">{p.approved} aprovadas</span>
                            <span className="text-red-400">{p.rejected} rejeitadas</span>
                            <span className="text-yellow-400">{p.pending} pendentes</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif text-lg font-bold">{p.total}</div>
                          <div className="text-xs text-muted-foreground">total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Planos tab */}
          <TabsContent value="planos">
            <PlanosTab />
          </TabsContent>

          {/* Assinantes tab */}
          <TabsContent value="assinantes">
            <AssinantesTab />
          </TabsContent>

        </Tabs>
      </div>

      {/* Add Discipline Dialog */}
      <Dialog open={showAddDiscipline} onOpenChange={setShowAddDiscipline}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Nova Grande Área" : "New Major Area"}</DialogTitle>
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
            <DialogTitle className="font-serif">{language === "pt" ? "Nova Disciplina" : "New Discipline"}</DialogTitle>
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
      <Dialog open={showAddQuestion} onOpenChange={(open) => { setShowAddQuestion(open); if (!open) resetNewQuestion(); }}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Nova Questão" : "New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Model selector M1–M10 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground font-sans">
                Modelo de Item (M1–M10)
              </label>
              <Select
                value={newQuestion.modelId || "__none__"}
                onValueChange={(v) => {
                  const mid = v === "__none__" ? "" : v;
                  const dbType = mid ? getDbTypeForModel(mid) : newQuestion.questionType;
                  setNewQuestion((p) => ({
                    ...p,
                    modelId: mid,
                    questionType: (dbType || p.questionType) as QuestionType,
                    correctOption: "A",
                    options: defaultOptions,
                    formatData: {},
                  }));
                }}
              >
                <SelectTrigger className="bg-background font-sans">
                  <SelectValue placeholder="Selecione o modelo de item..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem modelo definido —</SelectItem>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="font-sans">{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newQuestion.modelId && (
                <p className="text-xs text-emerald-400 font-sans px-1">
                  Tipo DB automático: <strong>{getDbTypeForModel(newQuestion.modelId)}</strong>
                </p>
              )}
            </div>

            {/* M10 block fields */}
            {newQuestion.modelId === "M10" && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="grupoId do bloco (ex: BLOCO_2024_Q1)"
                  value={newQuestion.grupoId}
                  onChange={(e) => setNewQuestion((p) => ({ ...p, grupoId: e.target.value }))}
                  className="bg-background font-sans text-sm"
                />
                <Input
                  placeholder="Posição no bloco (1, 2, 3...)"
                  type="number"
                  value={newQuestion.posicaoBloco}
                  onChange={(e) => setNewQuestion((p) => ({ ...p, posicaoBloco: e.target.value }))}
                  className="bg-background font-sans text-sm"
                />
              </div>
            )}

            {/* Question Type Selector */}
            <Select value={newQuestion.questionType} onValueChange={(v) => setNewQuestion((p) => ({ ...p, questionType: v as QuestionType, correctOption: "A", options: defaultOptions, formatData: {} }))}>
              <SelectTrigger className="bg-background font-sans">
                <SelectValue placeholder={language === "pt" ? "Tipo de Questão" : "Question Type"} />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, { pt: string; en: string; description: string }][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    <span className="font-sans">{language === "pt" ? label.pt : label.en}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type description hint */}
            <p className="text-xs text-muted-foreground font-sans px-1">
              {language === "pt" ? QUESTION_TYPE_LABELS[newQuestion.questionType].description : QUESTION_TYPE_LABELS[newQuestion.questionType].en}
            </p>

            {/* Question text */}
            <textarea
              placeholder="Enunciado PT *"
              value={newQuestion.textPt}
              onChange={(e) => setNewQuestion((p) => ({ ...p, textPt: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <textarea
              placeholder="Statement EN"
              value={newQuestion.textEn}
              onChange={(e) => setNewQuestion((p) => ({ ...p, textEn: e.target.value }))}
              rows={2}
              className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {/* Discipline + Difficulty */}
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

            {/* Subject tag + Author */}
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder={language === "pt" ? "Tag de disciplina" : "Discipline tag"} value={newQuestion.subjectTag} onChange={(e) => setNewQuestion((p) => ({ ...p, subjectTag: e.target.value }))} className="font-sans bg-background" />
              <Input placeholder={language === "pt" ? "Autor / Banca" : "Author / Board"} value={newQuestion.author} onChange={(e) => setNewQuestion((p) => ({ ...p, author: e.target.value }))} className="font-sans bg-background" />
            </div>

            {/* ── Format-specific sections ── */}

            {/* Assertion-Reason */}
            {newQuestion.questionType === "assertion_reason" && (
              <AssertionReasonSection
                assertion1={newQuestion.assertion1}
                assertion2={newQuestion.assertion2}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onChange={(field, value) => setNewQuestion((p) => ({ ...p, [field]: value }))}
              />
            )}

            {/* Complex Multiple Choice */}
            {newQuestion.questionType === "complex_multiple_choice" && (
              <ComplexMCSection
                items={newQuestion.formatData.items || []}
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onItemsChange={(items) => setNewQuestion((p) => ({ ...p, formatData: { ...p.formatData, items } }))}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* Matching */}
            {newQuestion.questionType === "matching" && (
              <MatchingSection
                pairs={newQuestion.formatData.pairs || []}
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onPairsChange={(pairs) => setNewQuestion((p) => ({ ...p, formatData: { ...p.formatData, pairs } }))}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* True/False Sequential */}
            {newQuestion.questionType === "true_false" && (
              <TrueFalseSection
                statements={newQuestion.formatData.statements || []}
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onStatementsChange={(statements) => setNewQuestion((p) => ({ ...p, formatData: { ...p.formatData, statements } }))}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* Ordering */}
            {newQuestion.questionType === "ordering" && (
              <OrderingSection
                steps={newQuestion.formatData.steps || []}
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onStepsChange={(steps) => setNewQuestion((p) => ({ ...p, formatData: { ...p.formatData, steps } }))}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* Cloze */}
            {newQuestion.questionType === "cloze" && (
              <ClozeSection
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* Clinical Case / Image Analysis / Interpretation */}
            {["clinical_case", "image_analysis", "interpretation"].includes(newQuestion.questionType) && (
              <>
                <MediaSection
                  questionType={newQuestion.questionType}
                  imageUrl={newQuestion.formatData.imageUrl}
                  caseText={newQuestion.formatData.caseText}
                  tableData={newQuestion.formatData.tableData}
                  lang={language as "pt" | "en"}
                  onChange={(field, val) => setNewQuestion((p) => ({ ...p, formatData: { ...p.formatData, [field]: val } }))}
                />
                <MultipleChoiceOptions
                  options={newQuestion.options}
                  correctOption={newQuestion.correctOption}
                  lang={language as "pt" | "en"}
                  onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                  onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
                />
              </>
            )}

            {/* Standard Multiple Choice options */}
            {newQuestion.questionType === "multiple_choice" && (
              <MultipleChoiceOptions
                options={newQuestion.options}
                correctOption={newQuestion.correctOption}
                lang={language as "pt" | "en"}
                onOptionsChange={(opts) => setNewQuestion((p) => ({ ...p, options: opts }))}
                onCorrectChange={(v) => setNewQuestion((p) => ({ ...p, correctOption: v }))}
              />
            )}

            {/* Explanation */}
            <textarea
              placeholder={language === "pt" ? "Explicação PT" : "Explanation PT"}
              value={newQuestion.explanationPt}
              onChange={(e) => setNewQuestion((p) => ({ ...p, explanationPt: e.target.value }))}
              rows={2}
              className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Input placeholder={language === "pt" ? "Ano (opcional)" : "Year (optional)"} value={newQuestion.year} onChange={(e) => setNewQuestion((p) => ({ ...p, year: e.target.value }))} className="font-sans bg-background" />

            {/* Image toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-sans">
              <input
                type="checkbox"
                checked={newQuestion.hasImage}
                onChange={(e) => setNewQuestion((p) => ({ ...p, hasImage: e.target.checked, imageUrl: e.target.checked ? p.imageUrl : "" }))}
                className="h-4 w-4 accent-primary"
              />
              {language === "pt" ? "Esta questão possui imagem" : "This question has an image"}
            </label>
            {newQuestion.hasImage && (
              <QuestionImageUpload
                value={newQuestion.imageUrl || null}
                onChange={(url) => setNewQuestion((p) => ({ ...p, imageUrl: url ?? "" }))}
                questionType="mc"
              />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowAddQuestion(false); resetNewQuestion(); }} className="flex-1 font-sans">{t("cancel")}</Button>
              <Button onClick={handleAddQuestion} disabled={createQuestion.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                {createQuestion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
       {/* Edit Question Dialog */}
      <Dialog open={!!editQuestionId} onOpenChange={(o) => { if (!o) { setEditQuestionId(null); setEditForm(null); } }}>
        <DialogContent className="bg-card border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{language === "pt" ? "Editar Questão" : "Edit Question"} #{editQuestionId}</DialogTitle>
          </DialogHeader>
          {editLoading || !editForm ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Model selector M1–M10 */}
              <div>
                <label className="text-xs font-sans text-muted-foreground mb-1 block">Modelo de Item (M1–M10)</label>
                <Select
                  value={editForm.modelId || "__none__"}
                  onValueChange={(v) => {
                    const mid = v === "__none__" ? "" : v;
                    const dbType = mid ? getDbTypeForModel(mid) : editForm.questionType;
                    setEditForm((p: any) => ({ ...p, modelId: mid, questionType: dbType || p.questionType }));
                  }}
                >
                  <SelectTrigger className="bg-background font-sans text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem modelo —</SelectItem>
                    {MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Enunciado */}
              <div>
                <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Enunciado (PT)" : "Statement (PT)"} *</label>
                <textarea
                  value={editForm.textPt}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, textPt: e.target.value }))}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {/* Metadata row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Grande Área" : "Major Area"}</label>
                  <Select value={editForm.disciplineId} onValueChange={(v) => setEditForm((p: any) => ({ ...p, disciplineId: v }))}>
                    <SelectTrigger className="bg-background font-sans text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {disciplines?.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{language === "pt" ? d.namePt : d.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Dificuldade" : "Difficulty"}</label>
                  <Select value={editForm.difficulty} onValueChange={(v) => setEditForm((p: any) => ({ ...p, difficulty: v }))}>
                    <SelectTrigger className="bg-background font-sans text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{language === "pt" ? "Fácil" : "Easy"}</SelectItem>
                      <SelectItem value="medium">{language === "pt" ? "Médio" : "Medium"}</SelectItem>
                      <SelectItem value="hard">{language === "pt" ? "Difícil" : "Hard"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Tipo" : "Type"}</label>
                  <Select value={editForm.questionType} onValueChange={(v) => setEditForm((p: any) => ({ ...p, questionType: v }))}>
                    <SelectTrigger className="bg-background font-sans text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{typeof v === 'object' ? (v as any).pt ?? k : v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Ano" : "Year"}</label>
                  <Input value={editForm.year} onChange={(e) => setEditForm((p: any) => ({ ...p, year: e.target.value }))} className="bg-background font-sans text-sm" placeholder="2024" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Autor/Banca" : "Author/Board"}</label>
                  <Input value={editForm.author} onChange={(e) => setEditForm((p: any) => ({ ...p, author: e.target.value }))} className="bg-background font-sans text-sm" />
                </div>
              </div>
              {/* Alternativas */}
              {editForm.questionType === "multiple_choice" && (
                <div>
                  <label className="text-xs font-sans text-muted-foreground mb-2 block">{language === "pt" ? "Alternativas" : "Options"}</label>
                  <div className="space-y-2">
                    {(editForm.options as Array<{id:string;textPt:string}>).map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditForm((p: any) => ({ ...p, correctOption: opt.id }))}
                          className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 border-2 transition-colors ${
                            editForm.correctOption === opt.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary"
                          }`}
                        >{opt.id}</button>
                        <Input
                          value={opt.textPt}
                          onChange={(e) => {
                            const opts = [...editForm.options];
                            opts[idx] = { ...opts[idx], textPt: e.target.value };
                            setEditForm((p: any) => ({ ...p, options: opts }));
                          }}
                          className="bg-background font-sans text-sm flex-1"
                          placeholder={`Alternativa ${opt.id}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{language === "pt" ? "Clique na letra para marcar como correta" : "Click the letter to mark as correct"}</p>
                </div>
              )}
              {/* Explicação */}
              <div>
                <label className="text-xs font-sans text-muted-foreground mb-1 block">{language === "pt" ? "Explicação (opcional)" : "Explanation (optional)"}</label>
                <textarea
                  value={editForm.explanationPt}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, explanationPt: e.target.value }))}
                  rows={3}
                  className="w-full p-3 rounded-lg bg-background border border-border/50 text-sm font-sans resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {/* Premium toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-premium"
                  checked={editForm.isPremium}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, isPremium: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="edit-premium" className="text-sm font-sans">{language === "pt" ? "Questão Premium" : "Premium Question"}</label>
              </div>

              {/* Image toggle + upload */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-sans">
                  <input
                    type="checkbox"
                    checked={!!(editForm.imageUrl)}
                    onChange={(e) => {
                      if (!e.target.checked) setEditForm((p: any) => ({ ...p, imageUrl: "" }));
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  {language === "pt" ? "Esta questão possui imagem" : "This question has an image"}
                </label>
                {editForm.imageUrl !== undefined && (
                  <QuestionImageUpload
                    value={editForm.imageUrl || null}
                    onChange={(url) => setEditForm((p: any) => ({ ...p, imageUrl: url ?? "" }))}
                    questionId={editQuestionId ?? undefined}
                    questionType="mc"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setEditQuestionId(null); setEditForm(null); }} className="flex-1 font-sans">{t("cancel")}</Button>
                <Button onClick={handleSaveEdit} disabled={updateQuestionMutation.isPending} className="flex-1 bg-primary text-primary-foreground font-sans">
                  {updateQuestionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === "pt" ? "Salvar Alterações" : "Save Changes")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ─── Import Tab (sub-component used by AdminPanel) ────────────────────────────
function ImportTab({ onImportComplete }: { onImportComplete: () => void }) {
  const [preloadedRows, setPreloadedRows] = useState<import("@/components/QuestionImport").ParsedMCQuestion[]>([]);
  const [activeSection, setActiveSection] = useState<"file" | "ai">("file");

  const handleAIExtracted = (questions: AIExtractedQuestion[]) => {
    // Map AIExtractedQuestion → ParsedMCQuestion (disciplineId is required; default 0 = unset)
    const mapped = questions.map((q) => ({
      textPt: q.textPt,
      disciplineId: q.disciplineId ?? 0,
      subjectTag: q.disciplineSuggestion,
      author: q.author ?? "",
      year: q.year,
      difficulty: q.difficulty,
      questionType: q.questionType as import("@/components/QuestionImport").ParsedMCQuestion["questionType"],
      optA: q.optA,
      optB: q.optB,
      optC: q.optC,
      optD: q.optD,
      optE: q.optE,
      correctOption: q.correctOption,
      explanationPt: q.explanationPt,
      assertion1: q.assertion1,
      assertion2: q.assertion2,
      _rowIndex: q._rowIndex,
      _errors: q._errors,
      _valid: q._valid,
    })) as import("@/components/QuestionImport").ParsedMCQuestion[];
    setPreloadedRows(mapped);
    setActiveSection("file");
    toast.success(`${mapped.length} questões carregadas na pré-visualização de importação`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold mb-1">Importar Questões</h2>
        <p className="text-sm text-muted-foreground font-sans">
          Importe questões em lote via CSV, XLSX ou JSON — ou use a IA para extrair automaticamente de PDFs e arquivos Word.
        </p>
      </div>

      {/* Section toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeSection === "file" ? "default" : "outline"}
          className="font-sans gap-1"
          onClick={() => setActiveSection("file")}
        >
          <Upload className="h-3.5 w-3.5" />
          CSV / XLSX / JSON
        </Button>
        <Button
          size="sm"
          variant={activeSection === "ai" ? "default" : "outline"}
          className="font-sans gap-1"
          onClick={() => setActiveSection("ai")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Extrair com IA (PDF / Word)
        </Button>
      </div>

      {activeSection === "ai" && (
        <AIQuestionExtractor onQuestionsExtracted={handleAIExtracted} />
      )}

      {activeSection === "file" && (
        <QuestionImport
          onImportComplete={(count) => { toast.success(`${count} questões importadas`); onImportComplete(); }}
          preloadedRows={preloadedRows.length > 0 ? preloadedRows : undefined}
        />
      )}
    </div>
  );
}

// ─── PlanosTab ────────────────────────────────────────────────────────────────
function PlanosTab() {
  const [activeSection, setActiveSection] = useState<"users" | "payments">("users");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "trial" | "premium" | "expired">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled" | "refunded">("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [extendDays, setExtendDays] = useState<number>(7);
  const [extendUserId, setExtendUserId] = useState<number | null>(null);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: "", planType: "monthly" as "monthly" | "annual", paymentMethod: "manual", notes: "" });

  const usersInput = useMemo(() => ({ page: 1, limit: 100, search: search || undefined, planFilter }), [search, planFilter]);
  const paymentsInput = useMemo(() => ({ page: 1, limit: 100, status: paymentStatusFilter, search: paymentSearch || undefined }), [paymentStatusFilter, paymentSearch]);

  const { data: usersData, refetch: refetchUsers, isLoading: usersLoading } = trpc.plans.listUsersWithPlans.useQuery(usersInput);
  const { data: paymentsData, refetch: refetchPayments, isLoading: paymentsLoading } = trpc.plans.listPayments.useQuery(paymentsInput);

  const updatePlan = trpc.plans.updateUserPlan.useMutation({ onSuccess: () => { toast.success("Plano atualizado"); refetchUsers(); } });
  const extendTrial = trpc.plans.extendTrial.useMutation({ onSuccess: () => { toast.success("Trial estendido"); setShowExtendDialog(false); refetchUsers(); } });
  const updatePayment = trpc.plans.updatePaymentStatus.useMutation({ onSuccess: () => { toast.success("Pagamento atualizado"); refetchPayments(); refetchUsers(); } });
  const createPayment = trpc.plans.createPaymentRecord.useMutation({ onSuccess: () => { toast.success("Registro criado"); setShowPaymentDialog(false); refetchPayments(); refetchUsers(); } });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
      premium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    const labels: Record<string, string> = { active: "Premium Ativo", trial: "Trial", free: "Free", expired: "Expirado", premium: "Premium" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${map[status] ?? map.free}`}>{labels[status] ?? status}</span>;
  };

  const paymentBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
      cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
      refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    const labels: Record<string, string> = { approved: "Aprovado", pending: "Pendente", rejected: "Recusado", cancelled: "Cancelado", refunded: "Reembolsado" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${map[status] ?? map.pending}`}>{labels[status] ?? status}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={activeSection === "users" ? "default" : "outline"} onClick={() => setActiveSection("users")} className="gap-1.5">
          <Users className="h-3.5 w-3.5" /> Usuários e Planos
        </Button>
        <Button size="sm" variant={activeSection === "payments" ? "default" : "outline"} onClick={() => setActiveSection("payments")} className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Pagamentos
        </Button>
      </div>

      {/* ── Users section ── */}
      {activeSection === "users" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs font-sans bg-background text-sm" />
            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
              <SelectTrigger className="w-40 font-sans bg-background text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => refetchUsers()} className="gap-1"><RefreshCw className="h-3 w-3" /> Atualizar</Button>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Usuário</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Trial</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vencimento Premium</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersData?.users ?? []).map((u) => (
                    <tr key={u.id} className="border-t border-border/30 hover:bg-muted/10">
                      <td className="px-3 py-2">
                        <div className="font-medium">{u.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2">{statusBadge((u as any).status)}</td>
                      <td className="px-3 py-2">
                        {u.trialEndsAt ? (
                          <div className="text-xs">
                            <div>{(u as any).trialDays != null ? `${(u as any).trialDays} dias restantes` : "—"}</div>
                            <div className="text-muted-foreground">{new Date(u.trialEndsAt).toLocaleDateString("pt-BR")}</div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">Não iniciado</span>}
                      </td>
                      <td className="px-3 py-2">
                        {u.premiumEndsAt ? (
                          <div className="text-xs">
                            <div className={(u as any).premiumDays === 0 ? "text-red-400" : ""}>{(u as any).premiumDays != null ? `${(u as any).premiumDays} dias` : "—"}</div>
                            <div className="text-muted-foreground">{new Date(u.premiumEndsAt).toLocaleDateString("pt-BR")}</div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {u.plan !== "premium" ? (
                            <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => updatePlan.mutate({ userId: u.id, plan: "premium", planType: "monthly", durationDays: 30 })}>
                              <Crown className="h-3 w-3" /> Premium
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10"
                              onClick={() => updatePlan.mutate({ userId: u.id, plan: "free" })}>
                              <XCircle className="h-3 w-3" /> Revogar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                            onClick={() => { setExtendUserId(u.id); setShowExtendDialog(true); }}>
                            <Timer className="h-3 w-3" /> Trial
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => { setSelectedUserId(u.id); setShowPaymentDialog(true); }}>
                            <CreditCard className="h-3 w-3" /> Pagamento
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(usersData?.users ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-sm">Nenhum usuário encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Payments section ── */}
      {activeSection === "payments" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Buscar por nome ou email..." value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} className="max-w-xs font-sans bg-background text-sm" />
            <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v as any)}>
              <SelectTrigger className="w-44 font-sans bg-background text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Recusado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => refetchPayments()} className="gap-1"><RefreshCw className="h-3 w-3" /> Atualizar</Button>
          </div>

          {paymentsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Usuário</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Plano</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Método</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(paymentsData?.payments ?? []).map((p: any) => (
                    <tr key={p.id} className="border-t border-border/30 hover:bg-muted/10">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.userName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.userEmail ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2 font-medium">R$ {Number(p.amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs capitalize">{p.planType ?? "—"}</td>
                      <td className="px-3 py-2 text-xs capitalize">{p.paymentMethod ?? "—"}</td>
                      <td className="px-3 py-2">
                        {paymentBadge(p.status)}
                        {p.failureReason && <div className="text-xs text-red-400 mt-0.5 max-w-[160px] truncate" title={p.failureReason}>{p.failureReason}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {p.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => updatePayment.mutate({ paymentId: p.id, status: "approved", activatePlan: true, planType: p.planType ?? "monthly" })}>
                                <CheckCircle className="h-3 w-3" /> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                                onClick={() => { const reason = prompt("Motivo da recusa:"); if (reason !== null) updatePayment.mutate({ paymentId: p.id, status: "rejected", failureReason: reason }); }}>
                                <XCircle className="h-3 w-3" /> Recusar
                              </Button>
                            </>
                          )}
                          {p.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                              onClick={() => updatePayment.mutate({ paymentId: p.id, status: "refunded" })}>
                              <RefreshCw className="h-3 w-3" /> Reembolsar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(paymentsData?.payments ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-sm">Nenhum pagamento encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Extend Trial Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-serif">Estender Trial</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Quantos dias deseja adicionar ao trial do usuário?</p>
            <div className="flex gap-2">
              {[7, 14, 30].map((d) => (
                <Button key={d} size="sm" variant={extendDays === d ? "default" : "outline"} onClick={() => setExtendDays(d)}>{d} dias</Button>
              ))}
              <Input type="number" min={1} max={365} value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="w-20 font-sans bg-background text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExtendDialog(false)}>Cancelar</Button>
              <Button onClick={() => extendUserId && extendTrial.mutate({ userId: extendUserId, days: extendDays })} disabled={extendTrial.isPending}>
                {extendTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Record Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle className="font-serif">Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input type="number" min={0} step={0.01} value={newPayment.amount} onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))} className="font-sans bg-background text-sm" placeholder="Ex: 39.90" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plano</label>
              <Select value={newPayment.planType} onValueChange={(v) => setNewPayment((p) => ({ ...p, planType: v as any }))}>
                <SelectTrigger className="font-sans bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal (R$ 39,90)</SelectItem>
                  <SelectItem value="annual">Anual (R$ 299,00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Método</label>
              <Select value={newPayment.paymentMethod} onValueChange={(v) => setNewPayment((p) => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger className="font-sans bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <Input value={newPayment.notes} onChange={(e) => setNewPayment((p) => ({ ...p, notes: e.target.value }))} className="font-sans bg-background text-sm" placeholder="Opcional" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
              <Button onClick={() => selectedUserId && createPayment.mutate({ userId: selectedUserId, amount: Number(newPayment.amount), planType: newPayment.planType, paymentMethod: newPayment.paymentMethod, notes: newPayment.notes || undefined, status: "approved", activatePlan: true })} disabled={createPayment.isPending || !newPayment.amount}>
                {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar e Ativar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Assinantes Tab ──────────────────────────────────────────────────────────
function AssinantesTab() {
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [planFilter, setPlanFilter] = useState<"all" | "trial" | "premium" | "free" | "expired">("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "7" | "15" | "30" | "expired">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = trpc.plans.listUsersWithPlans.useQuery({
    page: 1,
    limit: 100,
    planFilter: planFilter === "all" ? undefined : planFilter,
  });

  const updatePlan = trpc.plans.updateUserPlan.useMutation({
    onSuccess: () => { toast.success(isPt ? "Plano atualizado" : "Plan updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const users = (data?.users ?? []).filter((u: any) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (expiryFilter === "all") return true;
    const now = Date.now();
    if (expiryFilter === "expired") {
      return u.plan === "premium" && u.premiumEndsAt && new Date(u.premiumEndsAt).getTime() < now;
    }
    const days = parseInt(expiryFilter);
    const deadline = now + days * 86400000;
    if (u.plan === "premium" && u.premiumEndsAt) {
      const end = new Date(u.premiumEndsAt).getTime();
      return end > now && end <= deadline;
    }
    if (u.plan === "trial" && u.trialEndsAt) {
      const end = new Date(u.trialEndsAt).getTime();
      return end > now && end <= deadline;
    }
    return false;
  });

  function daysLeft(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  function planBadge(u: any) {
    const days = u.plan === "premium" ? daysLeft(u.premiumEndsAt) : daysLeft(u.trialEndsAt);
    if (u.plan === "premium") {
      if (days !== null && days <= 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-sans text-xs">{isPt ? "Expirado" : "Expired"}</Badge>;
      if (days !== null && days <= 7) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-sans text-xs">{isPt ? `Expira em ${days}d` : `Expires in ${days}d`}</Badge>;
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-sans text-xs"><Crown className="h-3 w-3 mr-1" />Premium</Badge>;
    }
    if (u.plan === "trial") {
      if (days !== null && days <= 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-sans text-xs">{isPt ? "Trial expirado" : "Trial expired"}</Badge>;
      if (days !== null && days <= 3) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-sans text-xs">{isPt ? `Trial: ${days}d` : `Trial: ${days}d`}</Badge>;
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-sans text-xs"><Timer className="h-3 w-3 mr-1" />Trial</Badge>;
    }
    return <Badge className="bg-muted/50 text-muted-foreground border-border font-sans text-xs">Free</Badge>;
  }

  // Stats
  const premiumCount = (data?.users ?? []).filter((u: any) => u.plan === "premium").length;
  const trialCount = (data?.users ?? []).filter((u: any) => u.plan === "trial").length;
  const freeCount = (data?.users ?? []).filter((u: any) => u.plan === "free").length;
  const expiringCount = (data?.users ?? []).filter((u: any) => {
    const days = u.plan === "premium" ? daysLeft(u.premiumEndsAt) : u.plan === "trial" ? daysLeft(u.trialEndsAt) : null;
    return days !== null && days > 0 && days <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground font-sans">Premium</span>
          </div>
          <div className="text-2xl font-bold font-serif text-yellow-400">{premiumCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted-foreground font-sans">Trial</span>
          </div>
          <div className="text-2xl font-bold font-serif text-blue-400">{trialCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-sans">Free</span>
          </div>
          <div className="text-2xl font-bold font-serif text-foreground">{freeCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-muted-foreground font-sans">{isPt ? "Expirando em 7d" : "Expiring in 7d"}</span>
          </div>
          <div className="text-2xl font-bold font-serif text-orange-400">{expiringCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={isPt ? "Buscar por nome ou email..." : "Search by name or email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
          <SelectTrigger className="w-40 font-sans text-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isPt ? "Todos os planos" : "All plans"}</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="expired">{isPt ? "Expirados" : "Expired"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v as any)}>
          <SelectTrigger className="w-48 font-sans text-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isPt ? "Qualquer vencimento" : "Any expiry"}</SelectItem>
            <SelectItem value="7">{isPt ? "Expira em 7 dias" : "Expires in 7 days"}</SelectItem>
            <SelectItem value="15">{isPt ? "Expira em 15 dias" : "Expires in 15 days"}</SelectItem>
            <SelectItem value="30">{isPt ? "Expira em 30 dias" : "Expires in 30 days"}</SelectItem>
            <SelectItem value="expired">{isPt ? "Já expirados" : "Already expired"}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1 font-sans">
          <RefreshCw className="h-3.5 w-3.5" />
          {isPt ? "Atualizar" : "Refresh"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-sans">
          {isPt ? "Nenhum assinante encontrado" : "No subscribers found"}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/80 border-b border-border/50">
              <tr>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Usuário" : "User"}</th>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Plano" : "Plan"}</th>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Início" : "Start"}</th>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Vencimento" : "Expires"}</th>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Dias restantes" : "Days left"}</th>
                <th className="text-left p-3 font-sans text-muted-foreground font-medium">{isPt ? "Ações" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, i: number) => {
                const isPremium = u.plan === "premium";
                const isTrial = u.plan === "trial";
                const endDate = isPremium ? u.premiumEndsAt : isTrial ? u.trialEndsAt : null;
                const startDate = isPremium ? u.premiumStartedAt : isTrial ? u.trialStartedAt : null;
                const days = daysLeft(endDate);
                const isExpired = days !== null && days <= 0;
                const isUrgent = days !== null && days > 0 && days <= 7;

                return (
                  <tr key={u.id} className={`border-b border-border/30 hover:bg-card/40 transition-colors ${isExpired ? "bg-red-500/5" : isUrgent ? "bg-orange-500/5" : ""}`}>
                    <td className="p-3">
                      <div className="font-sans font-medium text-foreground">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3">{planBadge(u)}</td>
                    <td className="p-3 text-muted-foreground font-sans text-xs">
                      {startDate ? new Date(startDate).toLocaleDateString(isPt ? "pt-BR" : "en-US") : "—"}
                    </td>
                    <td className="p-3 font-sans text-xs">
                      {endDate ? (
                        <span className={isExpired ? "text-red-400" : isUrgent ? "text-orange-400" : "text-foreground"}>
                          {new Date(endDate).toLocaleDateString(isPt ? "pt-BR" : "en-US")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      {days !== null ? (
                        <div className="flex items-center gap-1.5">
                          {isExpired ? (
                            <span className="flex items-center gap-1 text-red-400 text-xs font-sans">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {isPt ? "Expirado" : "Expired"}
                            </span>
                          ) : isUrgent ? (
                            <span className="flex items-center gap-1 text-orange-400 text-xs font-sans">
                              <Clock className="h-3.5 w-3.5" />
                              {days} {isPt ? "dias" : "days"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-sans">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {days} {isPt ? "dias" : "days"}
                            </span>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {!isPremium && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-sans border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                            onClick={() => updatePlan.mutate({ userId: u.id, plan: "premium", planType: "monthly" })}
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            {isPt ? "Ativar Premium" : "Activate Premium"}
                          </Button>
                        )}
                        {isPremium && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-sans border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => updatePlan.mutate({ userId: u.id, plan: "premium", durationDays: 30 })}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +30d
                          </Button>
                        )}
                        {(isPremium || isExpired) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-sans border-red-500/40 text-red-400 hover:bg-red-500/10"
                            onClick={() => updatePlan.mutate({ userId: u.id, plan: "free" })}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            {isPt ? "Cancelar" : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground font-sans">
        {users.length} {isPt ? "assinantes exibidos" : "subscribers shown"}
        {expiringCount > 0 && (
          <span className="ml-2 text-orange-400">
            · {expiringCount} {isPt ? "expirando em 7 dias" : "expiring within 7 days"}
          </span>
        )}
      </p>
    </div>
  );
}
