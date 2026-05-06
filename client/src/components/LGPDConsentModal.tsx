import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { Link } from "wouter";

const CONSENT_KEY = "vetrank-lgpd-consent";

export default function LGPDConsentModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on initial load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <Card className="border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Privacidade e Cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Utilizamos cookies essenciais para o funcionamento da plataforma e, com seu consentimento, cookies analíticos para melhorar sua experiência. Seus dados são tratados conforme a{" "}
                  <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.{" "}
                  Saiba mais em nossa{" "}
                  <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
                  {" "}e{" "}
                  <Link href="/terms" className="text-primary hover:underline">Termos de Uso</Link>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={accept} className="text-xs h-8">
                    Aceitar todos
                  </Button>
                  <Button size="sm" variant="outline" onClick={accept} className="text-xs h-8">
                    Apenas essenciais
                  </Button>
                  <Button size="sm" variant="ghost" onClick={decline} className="text-xs h-8 text-muted-foreground">
                    Recusar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
