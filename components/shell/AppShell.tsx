"use client";

import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

type Props = {
  children: ReactNode;
};

const STORAGE_KEY = "pes_vector_sidebar_collapsed";

export function AppShell({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
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
        {/* Sidebar */}
        <aside
          className={[
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

          <nav className="p-2 space-y-1 text-sm">
            <a
              href="/dashboard"
              className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              title="Field Events"
            >
              {collapsed ? "F" : "Field Events"}
            </a>
            <a
              href="/work-requests"
              className="block rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              title="Work Requests"
            >
              {collapsed ? "WR" : "Work Requests"}
            </a>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Header */}
          <header className="h-14 border-b border-border/60 flex items-center justify-between px-4">
            <div className="text-sm text-muted-foreground">
              Ops Dashboard
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggle}>
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
    </div>
  );
}
