"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { CreateFieldEventButton } from "@/components/field-events/CreateFieldEventButton";

type FieldEvent = {
  id: string;
  name: string;
  status: string;
  clients: { name: string } | null;
  programs: { name: string } | null;
  lead: { full_name: string } | null;
};

const STATUSES = ["not_started", "scheduled", "in_progress", "complete"];

export default function DashboardPage() {
  const [events, setEvents] = useState<FieldEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setFetchError(null);
      const { data, error } = await supabase
        .from("field_events")
        .select(
          "id, name, status, clients(name), programs(name), lead:profiles!field_events_lead_id_fkey(full_name)"
        );

      if (error) {
        console.error("field_events query error:", error);
        setFetchError(error.message);
        return;
      }

      setEvents((data ?? []) as unknown as FieldEvent[]);
    }
    load();
  }, [refreshKey]);

  function handleEventCreated() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Field Events</h1>
          <p className="text-sm text-muted-foreground">
            Status overview across all clients.
          </p>
        </div>
        <CreateFieldEventButton onSuccess={handleEventCreated} />
      </div>

      {fetchError && (
        <p className="text-sm text-destructive">
          Error loading field events: {fetchError}
        </p>
      )}
      <div className="grid grid-cols-4 gap-4">
        {STATUSES.map((status) => {
          const filtered = events.filter((e) => e.status === status);

          return (
            <div key={status} className="space-y-3">
              <div className="text-sm font-medium">
                {status} ({filtered.length})
              </div>

              <div className="space-y-2">
                {filtered.map((event) => (
                  <Link key={event.id} href={`/field-events/${event.id}`} className="block">
                    <Card className="p-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        {event.clients?.name ?? "No client"}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {event.programs?.name ?? "—"}
                      </div>
                      <div className="text-sm font-medium">{event.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Lead: {event.lead?.full_name ?? "Unassigned"}
                      </div>
                    </Card>
                  </Link>

                ))}

                {filtered.length === 0 && (
                  <div className="text-xs text-muted-foreground">No events</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
