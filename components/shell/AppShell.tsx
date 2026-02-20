"use client";

import { ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

type Props = {
  children: ReactNode;
};

const STORAGE_KEY = "pes_vector_sidebar_collapsed";

const NavLinks = ({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) => (
  <nav className="p-2 space-y-1 text-sm">
    <a
      href="/dashboard"
      className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
      title="Field Events"
      onClick={onNavigate}
    >
      {collapsed ? "F" : "Field Events"}
    </a>
    <a
      href="/work-requests"
      className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
      title="Work Requests"
      onClick={onNavigate}
    >
      {collapsed ? "WR" : "Work Requests"}
    </a>
    <a
      href="/clients"
      className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
      title="Clients"
      onClick={onNavigate}
    >
      {collapsed ? "C" : "Clients"}
    </a>
  </nav>
);

export function AppShell({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Desktop sidebar - hidden on mobile */}
        <aside
          className={[
            "hidden md:block",
            "border-r border-border/60 bg-background/50 backdrop-blur",
            collapsed ? "w-16" : "w-56",
            "transition-[width] duration-200",
            "h-screen sticky top-0",
          ].join(" ")}
        >
          <div className="h-14 flex items-center justify-between px-3 border-b border-border/60">
            <div className="font-semibold tracking-tight">
              {collapsed ? "PV" : "PES Vector"}
            </div>
          </div>
          <NavLinks collapsed={collapsed} />
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger - visible only on < md */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
              <div className="text-sm text-muted-foreground">
                Ops Dashboard
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                className="hidden md:inline-flex"
              >
                {collapsed ? "Expand" : "Collapse"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </header>

          <main className="p-4">{children}</main>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle className="text-left font-semibold">
              PES Vector
            </SheetTitle>
          </SheetHeader>
          <div className="py-2">
            <NavLinks onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
