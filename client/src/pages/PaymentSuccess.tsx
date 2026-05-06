import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Invalidate plan cache so the UI reflects the new premium status immediately
  useEffect(() => {
    utils.payment.myPlan.invalidate();
    utils.auth.me.invalidate();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <h1
          className="text-3xl font-bold mb-3 text-green-400"
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          Pagamento Aprovado!
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Bem-vindo ao <strong className="text-foreground">VetRank Premium</strong>! Seu acesso completo está ativo agora. Aproveite simulados ilimitados, ranking e todos os recursos premium.
        </p>

        <Card className="border-green-500/20 bg-green-500/5 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Acesso Premium Ativado</p>
                <p className="text-xs text-muted-foreground">Simulados ilimitados · Ranking · IA · Todos os recursos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/exam">
              Fazer meu primeiro simulado <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Ver meu painel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
