import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Plus, Pin, Calendar, Bell, BookOpen, Info, AlertTriangle } from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  exam: BookOpen, update: Bell, info: Info, warning: AlertTriangle,
};
const CATEGORY_COLORS: Record<string, string> = {
  exam: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  update: "bg-green-500/20 text-green-400 border-green-500/30",
  info: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};
const CATEGORY_LABELS: Record<string, string> = {
  exam: "Simulado", update: "Atualização", info: "Informação", warning: "Aviso",
};

export default function Announcements() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [titlePt, setTitlePt] = useState("");
  const [bodyPt, setBodyPt] = useState("");
  const [type, setType] = useState<"exam" | "update" | "info" | "warning">("info");
  const [pinned, setPinned] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const { data: announcements, refetch } = trpc.announcements.list.useQuery({ limit: 50 });

  const canManage = user && ["admin", "superuser", "coordinator", "teacher"].includes(user.role);

  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      toast.success("Anúncio publicado!");
      setCreateOpen(false);
      setTitlePt(""); setBodyPt(""); setScheduledFor(""); setPinned(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.announcements.update.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => { toast.success("Anúncio removido."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const list = (announcements as any[]) ?? [];
  const pinnedList = list.filter((a: any) => a.pinned);
  const regularList = list.filter((a: any) => !a.pinned);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
                Mural de Anúncios
              </h1>
              <p className="text-sm text-muted-foreground">Fique por dentro das novidades e simulados programados.</p>
            </div>
          </div>
          {canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Novo Anúncio</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Publicar Anúncio</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="mb-1 block">Título *</Label>
                    <Input placeholder="Título..." value={titlePt} onChange={e => setTitlePt(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Categoria</Label>
                    <Select value={type} onValueChange={(v) => setType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">📝 Simulado</SelectItem>
                        <SelectItem value="update">🔔 Atualização</SelectItem>
                        <SelectItem value="info">ℹ️ Informação</SelectItem>
                        <SelectItem value="warning">⚠️ Aviso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Conteúdo *</Label>
                    <Textarea placeholder="Descreva o anúncio..." value={bodyPt} onChange={e => setBodyPt(e.target.value)} rows={4} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Data programada (opcional)</Label>
                    <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Para simulados ou eventos futuros.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={pinned} onCheckedChange={setPinned} />
                    <Label>Fixar no topo</Label>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!titlePt || !bodyPt || createMutation.isPending}
                    onClick={() => createMutation.mutate({
                      titlePt,
                      bodyPt,
                      type,
                      pinned,
                      scheduledFor: scheduledFor || undefined,
                    })}
                  >
                    Publicar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {pinnedList.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1 uppercase tracking-wider">
              <Pin className="w-3 h-3" /> Fixados
            </h2>
            <div className="space-y-3">
              {pinnedList.map((a: any) => (
                <AnnouncementCard key={a.id} a={a} canManage={!!canManage}
                  onPin={() => updateMutation.mutate({ id: a.id, pinned: !a.pinned })}
                  onDelete={() => deleteMutation.mutate({ id: a.id })}
                />
              ))}
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum anúncio ainda. Fique ligado!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {regularList.map((a: any) => (
              <AnnouncementCard key={a.id} a={a} canManage={!!canManage}
                onPin={() => updateMutation.mutate({ id: a.id, pinned: !a.pinned })}
                onDelete={() => deleteMutation.mutate({ id: a.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ a, canManage, onPin, onDelete }: {
  a: any; canManage: boolean; onPin: () => void; onDelete: () => void;
}) {
  const Icon = CATEGORY_ICONS[a.type] ?? Info;
  const colorCls = CATEGORY_COLORS[a.type] ?? "bg-muted/20 text-muted-foreground border-border/40";
  return (
    <Card className={`border ${a.pinned ? "border-primary/40 bg-primary/5" : "border-border/50"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${colorCls}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm">{a.titlePt}</h3>
                {a.pinned && <Pin className="w-3 h-3 text-primary" />}
                <Badge variant="outline" className={`text-xs ${colorCls}`}>
                  {CATEGORY_LABELS[a.type] ?? a.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.bodyPt}</p>
              {a.scheduledFor && (
                <div className="flex items-center gap-1 mt-2 text-xs text-yellow-400">
                  <Calendar className="w-3 h-3" />
                  <span>Programado: {new Date(a.scheduledFor).toLocaleString("pt-BR")}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {a.authorName ?? "Sistema"} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={onPin} className="h-7 px-2" title={a.pinned ? "Desafixar" : "Fixar"}>
                <Pin className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 px-2 text-destructive hover:text-destructive">×</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
