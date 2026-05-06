import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import QuestionBank from "./pages/QuestionBank";
import ExamPage from "./pages/ExamPage";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import PracticeMode from "./pages/PracticeMode";
import CoordinatorPanel from "./pages/CoordinatorPanel";
import TeacherPanel from "./pages/TeacherPanel";
import Announcements from "./pages/Announcements";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import LGPDConsentModal from "./components/LGPDConsentModal";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import DiscursiveBank from "./pages/DiscursiveBank";
import Trails from "./pages/Trails";
import TrailDetail from "./pages/TrailDetail";
import Referrals from "./pages/Referrals";
import AuthGuard from "./components/AuthGuard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/bank" component={QuestionBank} />
      <Route path="/exam">{() => <AuthGuard><ExamPage /></AuthGuard>}</Route>
      <Route path="/practice">{() => <AuthGuard><PracticeMode /></AuthGuard>}</Route>
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/coordinator" component={CoordinatorPanel} />
      <Route path="/teacher" component={TeacherPanel} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms" component={TermsOfUse} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/failure" component={PaymentFailure} />
      <Route path="/payment/pending" component={PaymentFailure} />
      <Route path="/discursive">{() => <AuthGuard><DiscursiveBank /></AuthGuard>}</Route>
      <Route path="/trails">{() => <AuthGuard><Trails /></AuthGuard>}</Route>
      <Route path="/trails/:id">{() => <AuthGuard><TrailDetail /></AuthGuard>}</Route>
      <Route path="/referrals">{() => <AuthGuard><Referrals /></AuthGuard>}</Route>
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <LGPDConsentModal />
            <div className="min-h-screen bg-background text-foreground flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Router />
              </main>
              {/* Footer */}
              <footer className="border-t border-border/40 py-6 px-4 mt-auto">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>© 2025 VetRank. Todos os direitos reservados.</span>
                  <div className="flex gap-4">
                    <a href="/terms" className="hover:text-foreground transition-colors">Termos de Uso</a>
                    <a href="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</a>
                    <a href="/announcements" className="hover:text-foreground transition-colors">Mural</a>
                  </div>
                </div>
              </footer>
            </div>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
