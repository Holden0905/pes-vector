"use client";

import Link from "next/link";
import { Calendar, CalendarDays, ClipboardList, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const LINKS = [
  { href: "/field-events", label: "Field Events", icon: Calendar },
  { href: "/work-requests", label: "Work Requests", icon: ClipboardList },
  { href: "/weekly-work-schedule", label: "Weekly Work Schedule", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Quick access to ops tools.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="block">
            <Card className="h-full transition-colors hover:bg-accent/50 py-4 border-l-2 border-l-primary">
              <CardContent className="p-4 pt-4 flex flex-col items-start gap-2">
                <Icon className="size-6 text-primary" />
                <h2 className="text-lg font-semibold">{label}</h2>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
