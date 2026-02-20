"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

function FieldEventStatusColumn({
  status,
  events,
  renderCard,
}: {
  status: string;
  events: FieldEvent[];
  renderCard: (event: FieldEvent) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {status} ({events.length})
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[60px] space-y-2 rounded-md transition-colors ${
          isOver ? "bg-muted/50" : ""
        }`}
      >
        {events.map((event) => renderCard(event))}
        {events.length === 0 && (
          <div className="text-xs text-muted-foreground">No events</div>
        )}
      </div>
    </div>
  );
}

function FieldEventCard({
  event,
  canDrag,
}: {
  event: FieldEvent;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: event.id,
    data: { status: event.status },
    disabled: !canDrag,
  });
  return (
    <div ref={setNodeRef} className="block">
      <Card className="flex p-3 border-l-2 border-l-primary">
        {canDrag && (
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab self-start shrink-0 mr-2 rounded p-1 hover:bg-muted touch-none"
          >
            <GripVertical className="size-4 text-muted-foreground" />
          </div>
        )}
        <Link href={`/field-events/${event.id}`} className="min-w-0 flex-1 block">
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
        </Link>
      </Card>
    </div>
  );
}

export default function FieldEventsPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<FieldEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [canDrag, setCanDrag] = useState(false);

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

  useEffect(() => {
    if (!session?.user?.id) {
      setCanDrag(false);
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        const role = (data as { role?: string } | null)?.role;
        setCanDrag(role === "manager" || role === "tech");
      });
  }, [session?.user?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    async (ev: DragEndEvent) => {
      const { active, over } = ev;
      if (!over) return;
      const newStatus = String(over.id);
      if (!STATUSES.includes(newStatus)) return;
      const eventId = String(active.id);
      const event = events.find((e) => e.id === eventId);
      if (!event || event.status === newStatus) return;

      const prevEvents = events;
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
      );

      const { error: updErr } = await supabase
        .from("field_events")
        .update({ status: newStatus })
        .eq("id", eventId);

      if (updErr) {
        setEvents(prevEvents);
        toast.error("Failed to update status", {
          description: updErr.message,
        });
      }
    },
    [events]
  );

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

      {/* Mobile: single-column list with status filter */}
      <div className="md:hidden">
        <Tabs defaultValue="not_started" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            {STATUSES.map((status) => {
              const count = events.filter((e) => e.status === status).length;
              return (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="flex-1 min-w-0 text-xs"
                >
                  {status.replace(/_/g, " ")} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
          {STATUSES.map((status) => {
            const filtered = events.filter((e) => e.status === status);
            return (
              <TabsContent key={status} value={status} className="mt-3">
                <div className="space-y-2">
                  {filtered.map((event) => (
                    <Link
                      key={event.id}
                      href={`/field-events/${event.id}`}
                      className="block"
                    >
                      <Card className="p-3 border-l-2 border-l-primary">
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
                    <div className="text-xs text-muted-foreground py-4">
                      No events
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Desktop: 4-column kanban grid */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="hidden md:grid grid-cols-4 gap-4">
          {STATUSES.map((status) => {
            const filtered = events.filter((e) => e.status === status);
            return (
              <FieldEventStatusColumn
                key={status}
                status={status}
                events={filtered}
                renderCard={(event) => (
                  <FieldEventCard key={event.id} event={event} canDrag={canDrag} />
                )}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
