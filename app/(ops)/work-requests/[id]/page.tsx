"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type WorkRequestDetail = {
  id: string;
  field_event_id: string | null;
  wr_number: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  notes: string | null;
  primary_owner: { full_name: string } | null;
  field_events: {
    id: string;
    name: string | null;
    clients: { name: string } | null;
  } | null;
  wr_assignees: { user_id: string }[] | null;
};

export default function WorkRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<WorkRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("work_requests")
        .select(
          "id, field_event_id, wr_number, status, priority, due_date, notes, primary_owner:profiles!work_requests_primary_owner_id_fkey(full_name), field_events(id, name, clients(name)), wr_assignees(user_id)"
        )
        .eq("id", id)
        .single();

      setLoading(false);

      if (err) {
        if (err.code === "PGRST116") {
          notFound();
          return;
        }
        setError(err.message);
        return;
      }

      if (!data) {
        notFound();
        return;
      }

      setItem(data as unknown as WorkRequestDetail);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/work-requests"
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to work requests
        </Link>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/work-requests"
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to work requests
        </Link>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link
          href="/work-requests"
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to work requests
        </Link>
        <p>Loading...</p>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";
  const clientName = item.field_events?.clients?.name ?? "—";
  const fieldEventName = item.field_events?.name ?? "—";
  const hasAssignees =
    item.wr_assignees != null && item.wr_assignees.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/work-requests"
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to work requests
        </Link>
        {item.field_event_id && (
          <Link
            href={`/field-events/${item.field_event_id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            View field event
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-sm text-muted-foreground">WR number: </span>
          <span>{item.wr_number ?? "—"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Client: </span>
          <span>{clientName}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Field Event: </span>
          <span>{fieldEventName}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Status: </span>
          <span>{item.status}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Priority: </span>
          <span>{item.priority ?? "—"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Due date: </span>
          <span>{formatDate(item.due_date)}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Primary owner: </span>
          <span>{item.primary_owner?.full_name ?? "Unassigned"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Assigned: </span>
          <span>{hasAssignees ? "✅" : "—"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Notes: </span>
          <span>{item.notes ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
