import { Link, useLocation } from "wouter";
import { XCircle, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentFailure() {
  const [location] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const isPending = params.get("status") === "pending" || location.includes("pending");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
            isPending
              ? "bg-yellow-500/20 border-yellow-500/40"
              : "bg-red-500/20 border-red-500/40"
          }`}>
            {isPending
              ? <Clock className="w-10 h-10 text-yellow-400" />
              : <XCircle className="w-10 h-10 text-red-400" />
            }
          </div>
        </div>

        <h1
          className={`text-3xl font-bold mb-3 ${isPending ? "text-yellow-400" : "text-red-400"}`}
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          {isPending ? "Pagamento Pendente" : "Pagamento não Aprovado"}
        </h1>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          {isPending
            ? "Seu pagamento está sendo processado. Assim que confirmado, seu acesso Premium será ativado automaticamente. Você receberá uma notificação."
            : "Não foi possível processar seu pagamento. Isso pode ter ocorrido por dados incorretos, saldo insuficiente ou recusa do banco. Tente novamente."
          }
        </p>

        {isPending && (
          <Card className="border-yellow-500/20 bg-yellow-500/5 mb-6">
            <CardContent className="p-4 text-left">
              <p className="text-sm text-yellow-300 font-medium mb-1">O que acontece agora?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pagamentos via boleto ou Pix podem levar até 3 dias úteis para serem confirmados. Seu acesso será ativado automaticamente após a confirmação.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {!isPending && (
            <Button asChild size="lg" className="w-full">
              <Link href="/pricing">
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Precisa de ajuda? Entre em contato:{" "}
          <a href="mailto:calefi@csvet.com.br" className="text-primary hover:underline">
            calefi@csvet.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
