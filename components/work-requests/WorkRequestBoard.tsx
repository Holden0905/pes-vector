"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";

type WorkRequest = {
  id: string;
  wr_number: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  primary_owner: { full_name: string } | null;
  field_events: {
    clients: { name: string } | null;
    programs: { name: string } | null;
  } | null;
  wr_assignees: { user_id: string }[] | null;
};

const STATUSES = [
  "not_started",
  "drafting",
  "checking",
  "database",
  "ready_to_close",
];

export function WorkRequestBoard() {
  const [items, setItems] = useState<WorkRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const { data, error: err } = await supabase
        .from("work_requests")
        .select(`
          id,
          wr_number,
          status,
          priority,
          due_date,
          primary_owner:profiles!work_requests_primary_owner_id_fkey(full_name),
          field_events ( clients ( name ), programs ( name ) ),
          wr_assignees!wr_assignees_work_request_id_fkey ( user_id )
        `)
        .neq("status", "complete");

      if (err) {
        console.error("work_requests query error:", err);
        setError(err.message);
        return;
      }

      setItems((data ?? []) as unknown as WorkRequest[]);
    }
    load();
  }, []);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : null;

  const getClientName = (item: WorkRequest) =>
    item.field_events?.clients?.name ?? "No client";

  const getProgramName = (item: WorkRequest) =>
    item.field_events?.programs?.name ?? "—";

  const hasAssignees = (item: WorkRequest) =>
    item.wr_assignees != null && item.wr_assignees.length > 0;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">
          Error loading work requests: {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {STATUSES.map((status) => {
        const filtered = error != null ? [] : items.filter((item) => item.status === status);

        return (
          <div key={status} className="space-y-3">
            <div className="text-sm font-medium">
              {status} ({filtered.length})
            </div>

            <div className="space-y-2">
              {filtered.map((item) => (
                <Link key={item.id} href={`/work-requests/${item.id}`} className="block">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">
                      {getClientName(item)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getProgramName(item)}
                    </div>
                    <div className="text-sm font-bold">
                      {item.wr_number ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Primary: {item.primary_owner?.full_name ?? "Unassigned"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Assigned: {hasAssignees(item) ? "✅" : "☐"}
                    </div>
                    {formatDate(item.due_date) && (
                      <div className="text-xs text-muted-foreground">
                        Due: {formatDate(item.due_date)}
                      </div>
                    )}
                  </Card>
                </Link>
              ))}

              {filtered.length === 0 && (
                <div className="text-xs text-muted-foreground">None</div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
