import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Users, Shield, Activity, BarChart2, BookOpen, XCircle,
  UserPlus, UserMinus, Clock, CheckSquare, Loader2
} from "lucide-react";
import { Link } from "wouter";

// ─── Permission row component ─────────────────────────────────────────────────
interface PermRowProps {
  discipline: { id: number; namePt: string };
  perm: { id: number; canCreateQuestions: boolean; canValidateQuestions: boolean; canCreateExams: boolean } | undefined;
  onGrant: (disciplineId: number, opts: { canCreate: boolean; canValidate: boolean; canExams: boolean }) => void;
  onRevoke: (permId: number) => void;
  isGranting: boolean;
  isRevoking: boolean;
}

function PermRow({ discipline, perm, onGrant, onRevoke, isGranting, isRevoking }: PermRowProps) {
  const [canCreate, setCanCreate] = useState(perm?.canCreateQuestions ?? true);
  const [canValidate, setCanValidate] = useState(perm?.canValidateQuestions ?? false);
  const [canExams, setCanExams] = useState(perm?.canCreateExams ?? true);
  const granted = !!perm;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      granted ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"
    }`}>
      {/* Checkbox to toggle the whole permission */}
      <Checkbox
        checked={granted}
        disabled={isGranting || isRevoking}
        onCheckedChange={(checked) => {
          if (checked) {
            onGrant(discipline.id, { canCreate, canValidate, canExams });
          } else if (perm) {
            onRevoke(perm.id);
          }
        }}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium font-sans">{discipline.namePt}</p>
        {granted && (
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={perm?.canCreateQuestions ?? canCreate}
                disabled={!granted || isGranting}
                onCheckedChange={(v) => {
                  setCanCreate(!!v);
                  if (perm) onGrant(discipline.id, { canCreate: !!v, canValidate: perm.canValidateQuestions, canExams: perm.canCreateExams });
                }}
                className="h-3 w-3"
              />
              Criar questões
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={perm?.canValidateQuestions ?? canValidate}
                disabled={!granted || isGranting}
                onCheckedChange={(v) => {
                  setCanValidate(!!v);
                  if (perm) onGrant(discipline.id, { canCreate: perm.canCreateQuestions, canValidate: !!v, canExams: perm.canCreateExams });
                }}
                className="h-3 w-3"
              />
              Validar questões
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox
                checked={perm?.canCreateExams ?? canExams}
                disabled={!granted || isGranting}
                onCheckedChange={(v) => {
                  setCanExams(!!v);
                  if (perm) onGrant(discipline.id, { canCreate: perm.canCreateQuestions, canValidate: perm.canValidateQuestions, canExams: !!v });
                }}
                className="h-3 w-3"
              />
              Criar simulados
            </label>
          </div>
        )}
        {!granted && (
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox checked={canCreate} onCheckedChange={(v) => setCanCreate(!!v)} className="h-3 w-3" />
              Criar questões
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox checked={canValidate} onCheckedChange={(v) => setCanValidate(!!v)} className="h-3 w-3" />
              Validar questões
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <Checkbox checked={canExams} onCheckedChange={(v) => setCanExams(!!v)} className="h-3 w-3" />
              Criar simulados
            </label>
          </div>
        )}
      </div>

      {granted && (
        <Badge className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 shrink-0">
          Autorizado
        </Badge>
      )}
      {(isGranting || isRevoking) && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoordinatorPanel() {
  // ── ALL hooks must be called unconditionally before any early return ──────
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  const teacherIdInput = useMemo(
    () => ({ teacherId: selectedTeacherId! }),
    [selectedTeacherId]
  );

  const { data: stats } = trpc.coordinator.getPlatformStats.useQuery();
  const { data: teachers, refetch: refetchTeachers } = trpc.coordinator.listTeachers.useQuery();
  const { data: allUsers } = trpc.coordinator.listUsers.useQuery();
  const { data: activityLogs } = trpc.coordinator.getActivityLog.useQuery({ limit: 50 });
  const { data: disciplines } = trpc.questions.disciplines.useQuery();
  const { data: teacherPerms, refetch: refetchPerms } = trpc.coordinator.getTeacherPermissions.useQuery(
    teacherIdInput,
    { enabled: !!selectedTeacherId }
  );

  const promoteMutation = trpc.coordinator.promoteToTeacher.useMutation({
    onSuccess: () => { toast.success("Usuário promovido a Professor"); refetchTeachers(); },
    onError: (e) => toast.error(e.message),
  });
  const demoteMutation = trpc.coordinator.demoteToUser.useMutation({
    onSuccess: () => { toast.success("Professor rebaixado para Usuário"); refetchTeachers(); },
    onError: (e) => toast.error(e.message),
  });
  const grantMutation = trpc.coordinator.grantPermission.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada"); refetchPerms(); },
    onError: (e) => toast.error(e.message),
  });
  const revokeMutation = trpc.coordinator.revokePermission.useMutation({
    onSuccess: () => { toast.success("Permissão removida"); refetchPerms(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Access guard (after all hooks) ───────────────────────────────────────
  const allowed = ["coordinator", "superuser", "admin"];
  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas coordenadores podem acessar esta área.</p>
          <Link href="/"><Button className="mt-4">Voltar ao início</Button></Link>
        </Card>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const actionLabels: Record<string, string> = {
    promote_to_teacher: "Promoveu a Professor",
    demote_to_user: "Rebaixou para Usuário",
    grant_permission: "Concedeu Permissão",
    revoke_permission: "Revogou Permissão",
    create_question: "Criou Questão",
    validate_question_approved: "Aprovou Questão",
    validate_question_rejected: "Rejeitou Questão",
  };

  const handleGrant = (disciplineId: number, opts: { canCreate: boolean; canValidate: boolean; canExams: boolean }) => {
    if (!selectedTeacherId) return;
    // If permission already exists for this discipline, revoke first then re-grant
    const existing = teacherPerms?.find((p) => p.disciplineId === disciplineId);
    if (existing) {
      // Re-grant with updated permissions (backend upserts)
      grantMutation.mutate({
        teacherId: selectedTeacherId,
        disciplineId,
        canCreateQuestions: opts.canCreate,
        canValidateQuestions: opts.canValidate,
        canCreateExams: opts.canExams,
      });
    } else {
      grantMutation.mutate({
        teacherId: selectedTeacherId,
        disciplineId,
        canCreateQuestions: opts.canCreate,
        canValidateQuestions: opts.canValidate,
        canCreateExams: opts.canExams,
      });
    }
  };

  const selectedTeacher = teachers?.find((t) => t.id === selectedTeacherId);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
              Painel do Coordenador
            </h1>
          </div>
          <p className="text-muted-foreground">Gerencie professores, permissões e monitore atividades da plataforma.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total de Usuários", value: stats.users?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
              { label: "Professores", value: stats.users?.teachers ?? 0, icon: BookOpen, color: "text-green-400" },
              { label: "Premium", value: stats.users?.premiumUsers ?? 0, icon: Shield, color: "text-yellow-400" },
              { label: "Simulados Hoje", value: stats.exams?.examsToday ?? 0, icon: BarChart2, color: "text-purple-400" },
            ].map((s) => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="teachers">
          <TabsList className="mb-6">
            <TabsTrigger value="teachers"><Users className="w-4 h-4 mr-2" />Professores</TabsTrigger>
            <TabsTrigger value="permissions"><Shield className="w-4 h-4 mr-2" />Permissões</TabsTrigger>
            <TabsTrigger value="users"><UserPlus className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="w-4 h-4 mr-2" />Atividades</TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professores Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {!teachers || teachers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum professor cadastrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {teachers.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <p className="font-medium">{t.name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{t.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Último acesso: {t.lastSignedIn ? new Date(t.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTeacherId(t.id)}
                          >
                            <CheckSquare className="w-3 h-3 mr-1" />Permissões
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => demoteMutation.mutate({ userId: t.id })}
                          >
                            <UserMinus className="w-3 h-3 mr-1" />Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  Permissões por Grande Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Teacher selector */}
                <div className="mb-5">
                  <Label className="mb-2 block text-sm">Selecionar Professor</Label>
                  <div className="flex flex-wrap gap-2">
                    {!teachers || teachers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum professor cadastrado.</p>
                    ) : (
                      teachers.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTeacherId(t.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-sans border transition-colors ${
                            selectedTeacherId === t.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 border-border/50 hover:border-primary/50"
                          }`}
                        >
                          {t.name || t.email}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Permissions grid */}
                {selectedTeacherId ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Grandes áreas para{" "}
                        <span className="text-foreground">{selectedTeacher?.name || selectedTeacher?.email}</span>
                        {" — "}marque as áreas que este professor pode acessar:
                      </p>
                      <Badge variant="outline" className="text-xs font-sans">
                        {teacherPerms?.length ?? 0} / {disciplines?.length ?? 0} autorizadas
                      </Badge>
                    </div>

                    {!disciplines ? (
                      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Carregando grandes áreas...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {disciplines.map((d) => {
                          const perm = teacherPerms?.find((p) => p.disciplineId === d.id);
                          return (
                            <PermRow
                              key={d.id}
                              discipline={d}
                              perm={perm}
                              onGrant={handleGrant}
                              onRevoke={(permId) => revokeMutation.mutate({ permissionId: permId })}
                              isGranting={grantMutation.isPending}
                              isRevoking={revokeMutation.isPending}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Selecione um professor acima para gerenciar suas permissões.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Todos os Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allUsers?.filter(u => u.role === "user").map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="font-medium text-sm">{u.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => promoteMutation.mutate({ userId: u.id })}
                        disabled={promoteMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />Tornar Professor
                      </Button>
                    </div>
                  ))}
                  {allUsers?.filter(u => u.role === "user").length === 0 && (
                    <p className="text-muted-foreground text-center py-8 text-sm">Nenhum usuário comum cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Log de Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activityLogs?.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="text-primary">{log.userName || "Sistema"}</span>
                          {" — "}
                          {actionLabels[log.action] || log.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!activityLogs || activityLogs.length === 0) && (
                    <p className="text-muted-foreground text-center py-8 text-sm">Nenhuma atividade registrada.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
