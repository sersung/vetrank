import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Shield, Activity, BarChart2, BookOpen, CheckCircle, XCircle,
  UserPlus, UserMinus, Eye, Clock
} from "lucide-react";
import { Link } from "wouter";

export default function CoordinatorPanel() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [canCreate, setCanCreate] = useState(true);
  const [canValidate, setCanValidate] = useState(false);
  const [canExams, setCanExams] = useState(true);

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

  const { data: stats } = trpc.coordinator.getPlatformStats.useQuery();
  const { data: teachers, refetch: refetchTeachers } = trpc.coordinator.listTeachers.useQuery();
  const { data: allUsers } = trpc.coordinator.listUsers.useQuery();
  const { data: activityLogs } = trpc.coordinator.getActivityLog.useQuery({ limit: 50 });
  const { data: disciplines } = trpc.questions.disciplines.useQuery();
  const { data: teacherPerms, refetch: refetchPerms } = trpc.coordinator.getTeacherPermissions.useQuery(
    { teacherId: selectedTeacherId! },
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
    onSuccess: () => { toast.success("Permissão concedida"); refetchPerms(); setPermDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const revokeMutation = trpc.coordinator.revokePermission.useMutation({
    onSuccess: () => { toast.success("Permissão revogada"); refetchPerms(); },
    onError: (e) => toast.error(e.message),
  });

  const actionLabels: Record<string, string> = {
    promote_to_teacher: "Promoveu a Professor",
    demote_to_user: "Rebaixou para Usuário",
    grant_permission: "Concedeu Permissão",
    revoke_permission: "Revogou Permissão",
    create_question: "Criou Questão",
    validate_question_approved: "Aprovou Questão",
    validate_question_rejected: "Rejeitou Questão",
  };

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
                            onClick={() => { setSelectedTeacherId(t.id); }}
                          >
                            <Eye className="w-3 h-3 mr-1" />Permissões
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
                <CardTitle className="text-lg">Gerenciar Permissões por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="mb-2 block">Selecionar Professor</Label>
                  <Select onValueChange={(v) => setSelectedTeacherId(Number(v))}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Escolha um professor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers?.map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name || t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeacherId && (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium">Disciplinas Autorizadas</h3>
                      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm"><UserPlus className="w-4 h-4 mr-2" />Adicionar Disciplina</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Conceder Permissão de Disciplina</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div>
                              <Label className="mb-2 block">Disciplina</Label>
                              <Select onValueChange={setSelectedDisciplineId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {disciplines?.map((d: any) => (
                                    <SelectItem key={d.id} value={String(d.id)}>{d.namePt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Criar Questões</Label>
                              <Switch checked={canCreate} onCheckedChange={setCanCreate} />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Validar Questões</Label>
                              <Switch checked={canValidate} onCheckedChange={setCanValidate} />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Criar Simulados</Label>
                              <Switch checked={canExams} onCheckedChange={setCanExams} />
                            </div>
                            <Button
                              className="w-full"
                              disabled={!selectedDisciplineId}
                              onClick={() => grantMutation.mutate({
                                teacherId: selectedTeacherId,
                                disciplineId: Number(selectedDisciplineId),
                                canCreateQuestions: canCreate,
                                canValidateQuestions: canValidate,
                                canCreateExams: canExams,
                              })}
                            >
                              Conceder Permissão
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {!teacherPerms || teacherPerms.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4">Nenhuma permissão concedida ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {teacherPerms.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                            <div>
                              <p className="font-medium text-sm">{p.disciplineName}</p>
                              <div className="flex gap-2 mt-1">
                                {p.canCreateQuestions && <Badge variant="secondary" className="text-xs">Criar</Badge>}
                                {p.canValidateQuestions && <Badge variant="secondary" className="text-xs">Validar</Badge>}
                                {p.canCreateExams && <Badge variant="secondary" className="text-xs">Simulados</Badge>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => revokeMutation.mutate({ permissionId: p.id })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
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
                      >
                        <UserPlus className="w-3 h-3 mr-1" />Tornar Professor
                      </Button>
                    </div>
                  ))}
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
