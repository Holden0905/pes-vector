"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DashboardView = "field-events" | "work-requests";

export function ViewToggle({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (v: DashboardView) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DashboardView)}>
      <TabsList>
        <TabsTrigger value="field-events">Field Events</TabsTrigger>
        <TabsTrigger value="work-requests">Work Requests</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
