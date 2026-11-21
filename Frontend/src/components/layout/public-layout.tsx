import { Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/mocks/data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function PublicLayout({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Vamsha Vruksha home" className="text-foreground">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "text-foreground bg-accent" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <footer className="border-t border-border/70 bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="max-w-sm">
            <Logo className="text-foreground" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {siteConfig.purpose}
            </p>
          </div>
          <nav className="flex gap-8 text-sm" aria-label="Footer">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Explore
              </span>
              <Link to="/about" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                Login
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account
              </span>
              <Link to="/signup" className="text-muted-foreground hover:text-foreground">
                Sign Up
              </Link>
              <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                Forgot Password
              </Link>
            </div>
          </nav>
        </div>
        <div className={cn("border-t border-border/70 py-4 text-center text-xs text-muted-foreground")}>
          © {siteConfig.copyrightYear} {siteConfig.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
