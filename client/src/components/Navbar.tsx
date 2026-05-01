import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, useT } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BookOpen,
  ChevronDown,
  Crown,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Trophy,
  User,
  X,
  Zap,
  GraduationCap,
  Dumbbell,
  Megaphone,
  ALargeSmall,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

// Font size context stored in localStorage
function useFontSize() {
  const sizes = ["text-sm", "text-base", "text-lg"];
  const labels = ["Pequeno", "Médio", "Grande"];
  const stored = typeof window !== "undefined" ? localStorage.getItem("vetrank-fontsize") : null;
  const initial = stored ? Number(stored) : 1;
  const [sizeIdx, setSizeIdx] = useState(initial);

  const applySize = (idx: number) => {
    setSizeIdx(idx);
    localStorage.setItem("vetrank-fontsize", String(idx));
    document.documentElement.style.fontSize = idx === 0 ? "14px" : idx === 2 ? "18px" : "16px";
  };

  return { sizeIdx, applySize, sizes, labels };
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sizeIdx, applySize, labels } = useFontSize();

  const navLinks = [
    { href: "/bank", label: t("nav_bank"), icon: BookOpen },
    { href: "/practice", label: "Praticar", icon: Dumbbell },
    { href: "/exam", label: t("nav_exam"), icon: FlaskConical },
    { href: "/leaderboard", label: t("nav_leaderboard"), icon: Trophy },
    { href: "/announcements", label: "Mural", icon: Megaphone },
    { href: "/pricing", label: t("nav_pricing"), icon: Crown },
  ];

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const roleLinks = [];
  if (user?.role === "admin" || user?.role === "superuser") {
    roleLinks.push({ href: "/admin", label: t("nav_admin"), icon: LayoutDashboard });
    roleLinks.push({ href: "/coordinator", label: "Coordenador", icon: GraduationCap });
    roleLinks.push({ href: "/teacher", label: "Professor", icon: BookOpen });
  } else if (user?.role === "coordinator") {
    roleLinks.push({ href: "/coordinator", label: "Coordenador", icon: GraduationCap });
    roleLinks.push({ href: "/teacher", label: "Professor", icon: BookOpen });
  } else if (user?.role === "teacher") {
    roleLinks.push({ href: "/teacher", label: "Painel Prof.", icon: BookOpen });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-serif text-xl font-bold text-gradient">VetRank</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {roleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* Font size */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground px-2">
                  <ALargeSmall className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {labels.map((label, i) => (
                  <DropdownMenuItem
                    key={label}
                    onClick={() => applySize(i)}
                    className={sizeIdx === i ? "text-primary font-medium" : ""}
                  >
                    {sizeIdx === i ? "✓ " : ""}{label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground px-2"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Language selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground px-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setLanguage("pt")} className={language === "pt" ? "text-primary" : ""}>
                  🇧🇷 Português
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "text-primary" : ""}>
                  🇺🇸 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="hidden sm:block text-sm max-w-24 truncate">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Meu Desempenho
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("nav_profile")}
                    </Link>
                  </DropdownMenuItem>
                  {roleLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex items-center gap-2">
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav_logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                {t("nav_login")}
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden px-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border/50 py-3 space-y-1">
            {[...navLinks, ...roleLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <LayoutDashboard className="h-4 w-4" />Meu Desempenho
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <User className="h-4 w-4" />{t("nav_profile")}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
