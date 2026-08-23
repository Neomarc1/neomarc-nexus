import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Map,
  CalendarCheck,
  Handshake,
  BookmarkCheck,
  Banknote,
  Receipt,
  FileText,
  Percent,
  HardHat,
  ListTodo,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserCircle2,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  MessageSquare,
  Bug,
  FlaskConical,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, ROLE_LABELS } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/GlobalSearch";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { OnboardingGuide } from "@/components/OnboardingGuide";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Users;
  staffOnly?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Command",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/operations", label: "Operations", icon: ListTodo, staffOnly: true },
      { to: "/ai", label: "AI Chief of Staff", icon: Sparkles },
    ],
  },
  {
    group: "Field Operations",
    items: [
      { to: "/my-work", label: "My Work", icon: Handshake },
      { to: "/my-work/leads", label: "My Leads", icon: Users },
      { to: "/my-work/inspections", label: "My Inspections", icon: CalendarCheck },
      { to: "/properties/search", label: "Property Finder", icon: Map },
      { to: "/accounts", label: "Accounts Desk", icon: Banknote, staffOnly: true },
      { to: "/documentation", label: "Documentation Desk", icon: FileText, staffOnly: true },
    ],
  },
  {
    group: "Sales & CRM",
    items: [
      { to: "/leads", label: "Leads / CRM", icon: Users },
      { to: "/customers", label: "Customers", icon: UserCheck, staffOnly: true },
      { to: "/realtors", label: "Realtors", icon: Handshake, staffOnly: true },
      { to: "/inspections", label: "Inspections", icon: CalendarCheck },
      { to: "/reservations", label: "Reservations", icon: BookmarkCheck },
      { to: "/sales", label: "Sales", icon: Percent },
    ],
  },
  {
    group: "Inventory",
    items: [
      { to: "/estates", label: "Estates", icon: Building2 },
      { to: "/inventory", label: "Inventory", icon: Map },
    ],
  },
  {
    group: "Finance",
    items: [
      { to: "/payments", label: "Payments", icon: Banknote, staffOnly: true },
      { to: "/receivables", label: "Receivables", icon: Receipt, staffOnly: true },
      { to: "/commissions", label: "Commissions", icon: Percent },
      { to: "/commission-rules", label: "Commission Rules", icon: Percent, staffOnly: true },
      { to: "/expenses", label: "Expenses", icon: Banknote, staffOnly: true },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/tasks", label: "Tasks", icon: ListTodo },
      { to: "/projects", label: "Projects", icon: HardHat, staffOnly: true },
      { to: "/reports", label: "Reports", icon: BarChart3, staffOnly: true },
      { to: "/audit", label: "Audit Log", icon: ShieldCheck, staffOnly: true },
    ],
  },
  {
    group: "System Testing",
    items: [
      { to: "/system/health", label: "Workflow Health", icon: Activity, adminOnly: true },
      { to: "/operations/exceptions", label: "Exception Centre", icon: AlertTriangle, staffOnly: true },
      { to: "/system/uat", label: "UAT Checklist", icon: ClipboardCheck, staffOnly: true },
      { to: "/management/feedback", label: "Pilot Feedback", icon: MessageSquare, adminOnly: true },
      { to: "/system/errors", label: "Error Reports", icon: Bug, adminOnly: true },
      { to: "/system/pilot", label: "Pilot Team", icon: Users, adminOnly: true },
      { to: "/system/roles", label: "Role Access Review", icon: ShieldCheck, superAdminOnly: true },
      { to: "/system/test-data", label: "Test Data Safety", icon: FlaskConical, superAdminOnly: true },
    ],
  },
  {
    group: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/portal", label: "Customer Portal", icon: UserCircle2 },
      { to: "/settings", label: "Settings", icon: Settings, staffOnly: true },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useCurrentUser();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="gold-gradient flex h-10 w-10 items-center justify-center rounded-lg font-display text-lg font-bold text-gold-foreground">
            N
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-wide">NEOMARC</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              Digital OS
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter(
            (i) =>
              (!i.staffOnly || me?.isStaff) &&
              (!i.adminOnly || me?.isAdmin) &&
              (!i.superAdminOnly || me?.roles.includes("super_admin")),
          );
          if (!items.length) return null;
          return (
            <div key={group.group}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4 text-xs text-sidebar-foreground/60">
        Creating Value, and Sustainable Wealth.
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-md"
          >
            <Search className="h-4 w-4" />
            <span className="truncate">Search leads, customers, plots, receipts…</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/notifications" aria-label="Notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {me?.profile?.full_name ?? me?.user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[me?.primaryRole ?? "customer"]}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
