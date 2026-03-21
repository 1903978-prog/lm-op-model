import { useState, useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import NewTrip from "@/pages/new-trip";
import Admin from "@/pages/admin";
import Deadlines from "@/pages/deadlines";
import PackingPage from "@/pages/packing";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { LayoutDashboard, Settings, Plane, CalendarClock, Luggage } from "lucide-react";

const navItems = [
  { title: "Dashboard",   url: "/",           icon: LayoutDashboard },
  { title: "Plan a Trip", url: "/trips/new",  icon: Plane },
  { title: "Deadlines",   url: "/deadlines",  icon: CalendarClock },
  { title: "Packing",     url: "/packing",    icon: Luggage },
  { title: "Admin",       url: "/admin",       icon: Settings },
];

const MIN_FONT = 12;
const MAX_FONT = 30;
const STEP     = 1;
const DEFAULT_FONT = 18;
const LS_KEY   = "app-font-size";

function TopNav({ fontSize, onDecrease, onIncrease }: {
  fontSize: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const [location] = useLocation();
  return (
    <header className="flex items-center gap-4 px-4 h-12 border-b bg-card shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <Plane className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm tracking-tight">TravelPrep</span>
      </div>

      <nav className="flex items-center gap-1 flex-1">
        {navItems.map((item) => {
          const active = location === item.url;
          return (
            <Link key={item.url} href={item.url}>
              <button
                data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Font size controls */}
      <div className="flex items-center gap-1 border rounded-md overflow-hidden shrink-0">
        <button
          onClick={onDecrease}
          disabled={fontSize <= MIN_FONT}
          data-testid="button-font-decrease"
          title="Decrease font size"
          className="px-2.5 py-1 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none"
        >
          A−
        </button>
        <span className="px-2 text-xs text-muted-foreground border-l border-r select-none tabular-nums">
          {fontSize}px
        </span>
        <button
          onClick={onIncrease}
          disabled={fontSize >= MAX_FONT}
          data-testid="button-font-increase"
          title="Increase font size"
          className="px-2.5 py-1 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none"
        >
          A+
        </button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trips/new" component={NewTrip} />
      <Route path="/admin" component={Admin} />
      <Route path="/deadlines" component={Deadlines} />
      <Route path="/packing" component={PackingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_FONT;
  });
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(LS_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data: { authenticated: boolean }) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const decrease = () => setFontSize((s) => Math.max(MIN_FONT, s - STEP));
  const increase = () => setFontSize((s) => Math.min(MAX_FONT, s + STEP));

  if (authenticated === null) return null; // Loading

  if (!authenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onSuccess={() => setAuthenticated(true)} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen w-full">
          <TopNav fontSize={fontSize} onDecrease={decrease} onIncrease={increase} />
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
