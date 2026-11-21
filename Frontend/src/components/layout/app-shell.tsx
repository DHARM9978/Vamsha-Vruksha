import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FilePlus2,
  FilePen,
  Gem,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Network,
  PencilLine,
  ShieldCheck,
  Sun,
  TreeDeciduous,
  User,
  UserPlus,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth";
import type { Role, Session } from "@/types";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Overview", to: "/app", icon: LayoutDashboard }],
  },
  {
    title: "Family Management",
    items: [
      { label: "Create Family", to: "/app/families/new", icon: FilePlus2, adminOnly: true },
      { label: "Edit Family", to: "/app/families/edit", icon: FilePen, adminOnly: true },
    ],
  },
  {
    title: "People & Relationships",
    items: [
      { label: "Add Person", to: "/app/people/new", icon: UserPlus, adminOnly: true },
      { label: "Edit Person", to: "/app/people/edit", icon: UserRoundCog, adminOnly: true },
      { label: "Add Relation", to: "/app/relations/new", icon: Network, adminOnly: true },
      { label: "Edit Relation", to: "/app/relations/edit", icon: PencilLine, adminOnly: true },
    ],
  },
  {
    title: "Heritage Masters",
    items: [
      { label: "Gotra", to: "/app/masters/gotra", icon: Gem, adminOnly: true },
      { label: "Sutra", to: "/app/masters/sutra", icon: Gem, adminOnly: true },
      { label: "Vamsha", to: "/app/masters/vamsha", icon: Gem, adminOnly: true },
      { label: "Kula Devatha", to: "/app/masters/kula-devatha", icon: Gem, adminOnly: true },
      { label: "Mane Devru", to: "/app/masters/mane-devru", icon: Gem, adminOnly: true },
      { label: "Panchang Sudhi", to: "/app/masters/panchang-sudhi", icon: Gem, adminOnly: true },
      { label: "Pooja Vruksha", to: "/app/masters/pooja-vruksha", icon: Leaf, adminOnly: true },
    ],
  },
  {
    title: "Explore",
    items: [
      { label: "Family Tree", to: "/app/tree", icon: TreeDeciduous },
      { label: "Family Details", to: "/app/family-details", icon: BookOpen },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", to: "/app/profile", icon: User },
      { label: "Change Password", to: "/app/change-password", icon: ShieldCheck },
    ],
  },
  {
    title: "Users",
    items: [{ label: "Add Admin/User", to: "/app/users/new", icon: Users, adminOnly: true }],
  },
];

const MASTER_PATH_PREFIX = "/app/masters/";

function isActive(pathname: string, item: NavItem) {
  if (item.to === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  if (item.to.startsWith(MASTER_PATH_PREFIX)) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

function NavLinks({
  session,
  pathname,
  collapsed,
  onNavigate,
}: {
  session: Session;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const role: Role = session.role;

  return (
    <nav
      aria-label="Application"
      className="vv-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4"
    >
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter(
          (i) => !i.adminOnly || role === "admin"
        );

        if (items.length === 0) return null;

        return (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </p>
            )}

            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item);

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon
                        className="size-[17px] shrink-0"
                        aria-hidden="true"
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 items-center border-b border-border px-4",
        collapsed && "justify-center px-0"
      )}
    >
      <Link
        to="/app"
        className="text-foreground"
        aria-label="Vamsha Vruksha overview"
      >
        {collapsed ? (
          <Logo compact markClassName="size-10 rounded-xl" />
        ) : (
          <Logo />
        )}
      </Link>
    </div>
  );
}

/** Authenticated application shell: sidebar, topbar, profile menu, theme toggle. */
export function AppShell({
  session,
  outletContext,
}: {
  session: Session;
  outletContext?: unknown;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const { theme, toggle } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load the saved sidebar state once on the client.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("vv.sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;

      try {
        localStorage.setItem(
          "vv.sidebar",
          next ? "collapsed" : "expanded"
        );
      } catch {
        /* ignore */
      }

      return next;
    });
  };

  // Lock body scroll and close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;

    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const pageTitle = useMemo(() => {
    for (const group of NAV_GROUPS) {
      const match = group.items.find((i) =>
        isActive(pathname, i)
      );

      if (match) return match.label;
    }

    return "Vamsha Vruksha";
  }, [pathname]);

  async function handleLogout() {
    signOut();
    navigate({ to: "/login", replace: true });
  }

  const roleBadge = (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
      {session.role === "admin" ? "Admin" : "User"}
    </span>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarBrand collapsed={collapsed} />

        <NavLinks
          session={session}
          pathname={pathname}
          collapsed={collapsed}
        />

        <div className="border-t border-border p-3">
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile off-canvas drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card shadow-pop">
            <SidebarBrand collapsed={false} />

            <NavLinks
              session={session}
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
              {pageTitle}
            </h2>

            <DemoModeBanner />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-[18px]" />
              ) : (
                <Moon className="size-[18px]" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-accent"
                  aria-label="Account menu"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                      {initials(session.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="hidden max-w-28 truncate text-[13px] font-semibold sm:block">
                    {session.fullName}
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {session.fullName}
                    </span>

                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {session.email}
                    </span>

                    <span className="mt-1">{roleBadge}</span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/app/profile">Profile</Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/app/change-password">
                    Change Password
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}