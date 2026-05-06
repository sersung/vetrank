/**
 * QuestionImageUpload
 * ─────────────────────────────────────────────────────────────────────────────
 * Drag-and-drop / click-to-select image upload for questions.
 * Accepts JPEG, PNG, WebP, GIF (max 8 MB).
 * Sends base64 to the server where Sharp converts it to WebP ≤1200px wide.
 * Returns the stored URL for use in question forms or import previews.
 */
import { useCallback, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

interface Props {
  /** Current image URL (if already set) */
  value?: string | null;
  /** Called when a new image is uploaded or removed */
  onChange: (url: string | null) => void;
  /** Optional: auto-attach to an existing question on upload */
  questionId?: number;
  questionType?: "mc" | "discursive";
  /** Max file size in bytes (default 8 MB) */
  maxBytes?: number;
  className?: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DEFAULT_MAX = 8 * 1024 * 1024; // 8 MB

export function QuestionImageUpload({
  value,
  onChange,
  questionId,
  questionType = "mc",
  maxBytes = DEFAULT_MAX,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  const uploadMutation = trpc.questions.uploadImage.useMutation({
    onSuccess: (data) => {
      setPreview(data.url);
      onChange(data.url);
      toast.success("Imagem enviada com sucesso");
    },
    onError: (err) => {
      toast.error(`Erro ao enviar imagem: ${err.message}`);
    },
  });

  const processFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Formato não suportado. Use JPEG, PNG, WebP ou GIF.");
        return;
      }
      if (file.size > maxBytes) {
        toast.error(`Arquivo muito grande. Máximo: ${Math.round(maxBytes / 1024 / 1024)} MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        uploadMutation.mutate({
          base64,
          filename: file.name,
          questionId,
          questionType,
        });
      };
      reader.readAsDataURL(file);
    },
    [maxBytes, questionId, questionType, uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Preview */}
      {preview ? (
        <div className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted/20">
          <img
            src={preview}
            alt="Imagem da questão"
            className="w-full max-h-64 object-contain"
            style={{ imageRendering: "auto" }}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 bg-background/80"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="h-3.5 w-3.5" />
              Trocar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 bg-background/80 text-destructive border-destructive/40"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer
            ${dragging ? "border-primary bg-primary/10" : "border-border/50 bg-muted/10 hover:border-primary/50 hover:bg-muted/20"}
            ${uploadMutation.isPending ? "pointer-events-none opacity-60" : ""}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processando imagem…</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Arraste uma imagem ou <span className="text-primary underline">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG · PNG · WebP · GIF — máx. {Math.round(maxBytes / 1024 / 1024)} MB
                </p>
                <p className="text-xs text-muted-foreground">
                  A imagem será convertida para WebP (≤1200 px, qualidade 80) automaticamente.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
