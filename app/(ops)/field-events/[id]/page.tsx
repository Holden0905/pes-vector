"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


type FieldEventDetail = {
  id: string;
  name: string;
  status: string;
  event_type: string | null;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  clients: { name: string } | null;
  lead: { full_name: string } | null;
};

export default function FieldEventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<FieldEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("field_events")
        .select(
          "id, name, status, event_type, priority, start_date, end_date, clients(name), lead:profiles!field_events_lead_id_fkey(full_name)"
        )
        .eq("id", id)
        .single();

      setLoading(false);

      if (err) {
        setError(err.message);
        return;
      }

      setEvent(data as unknown as FieldEventDetail);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          Back to dashboard
        </Link>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          Back to dashboard
        </Link>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          Back to dashboard
        </Link>
        <p>Event not found.</p>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        Back to dashboard
      </Link>

      <div className="space-y-2">
        <div>
          <span className="text-sm text-muted-foreground">Client: </span>
          <span>{event.clients?.name ?? "—"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Event name: </span>
          <span>{event.name}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Status: </span>
          <span>{event.status}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Lead: </span>
          <span>{event.lead?.full_name ?? "Unassigned"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Dates: </span>
          <span>
            {formatDate(event.start_date)} – {formatDate(event.end_date)}
          </span>
        </div>
      </div>
    </div>
  );
}
