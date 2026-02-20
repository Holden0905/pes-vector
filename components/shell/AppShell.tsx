"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Calendar, CalendarDays, ClipboardList, LayoutDashboard, Menu, Users } from "lucide-react";
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
  <nav className={`p-2 space-y-1 text-sm ${collapsed ? "flex flex-col items-center" : ""}`}>
    <a
      href="/dashboard"
      className={`block rounded-md hover:bg-accent hover:text-accent-foreground ${collapsed ? "flex size-9 items-center justify-center" : "px-3 py-2"}`}
      title="Dashboard"
      onClick={onNavigate}
    >
      {collapsed ? <LayoutDashboard className="size-5" /> : "Dashboard"}
    </a>
    <a
      href="/field-events"
      className={`block rounded-md hover:bg-accent hover:text-accent-foreground ${collapsed ? "flex size-9 items-center justify-center" : "px-3 py-2"}`}
      title="Field Events"
      onClick={onNavigate}
    >
      {collapsed ? <Calendar className="size-5" /> : "Field Events"}
    </a>
    <a
      href="/work-requests"
      className={`block rounded-md hover:bg-accent hover:text-accent-foreground ${collapsed ? "flex size-9 items-center justify-center" : "px-3 py-2"}`}
      title="Work Requests"
      onClick={onNavigate}
    >
      {collapsed ? <ClipboardList className="size-5" /> : "Work Requests"}
    </a>
    <a
      href="/weekly-work-schedule"
      className={`block rounded-md hover:bg-accent hover:text-accent-foreground ${collapsed ? "flex size-9 items-center justify-center" : "px-3 py-2"}`}
      title="Weekly Work Schedule"
      onClick={onNavigate}
    >
      {collapsed ? <CalendarDays className="size-5" /> : "Weekly Work Schedule"}
    </a>
    <a
      href="/clients"
      className={`block rounded-md hover:bg-accent hover:text-accent-foreground ${collapsed ? "flex size-9 items-center justify-center" : "px-3 py-2"}`}
      title="Clients"
      onClick={onNavigate}
    >
      {collapsed ? <Users className="size-5" /> : "Clients"}
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
            "hidden md:block shrink-0 overflow-hidden",
            "border-r border-border/60 bg-background/50 backdrop-blur",
            collapsed ? "w-14" : "w-56",
            "transition-[width] duration-200",
            "h-screen sticky top-0",
          ].join(" ")}
        >
          <div className={`h-14 flex items-center border-b border-border/60 ${collapsed ? "justify-center px-0" : "px-3"}`}>
            <div className={`flex items-center gap-3 px-4 py-4 ${collapsed ? "justify-center px-0" : ""}`}>
              <Image
                src="/brand/pes-mark-black.jpg"
                alt="PES"
                width={34}
                height={34}
                className="object-contain opacity-95"
              />
              {!collapsed && (
                <span className="text-2xl font-bold tracking-wider text-primary leading-none">Vector</span>
              )}
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
              <div className="text-xl text-muted-foreground font-medium">
                Proactive Environmental Services
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
