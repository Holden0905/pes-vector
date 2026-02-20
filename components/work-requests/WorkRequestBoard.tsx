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
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

type WorkRequest = {
  id: string;
  wr_number: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  primary_owner: { full_name: string } | null;
  assigned_to: { full_name: string } | null;
  field_events: {
    clients: { name: string } | null;
    programs: { name: string } | null;
  } | null;
};

const STATUSES = [
  "not_started",
  "drafting",
  "checking",
  "database",
  "ready_to_close",
];

function StatusColumn({
  status,
  items,
  getClientName,
  getProgramName,
  formatDate,
  canDrag,
  renderCard,
}: {
  status: string;
  items: WorkRequest[];
  getClientName: (i: WorkRequest) => string;
  getProgramName: (i: WorkRequest) => string;
  formatDate: (d: string | null) => string | null;
  canDrag: boolean;
  renderCard: (item: WorkRequest) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {status} ({items.length})
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[60px] space-y-2 rounded-md transition-colors ${
          isOver ? "bg-muted/50" : ""
        }`}
      >
        {items.map((item) => renderCard(item))}
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground">None</div>
        )}
      </div>
    </div>
  );
}

function WRCard({
  item,
  getClientName,
  getProgramName,
  formatDate,
  canDrag,
}: {
  item: WorkRequest;
  getClientName: (i: WorkRequest) => string;
  getProgramName: (i: WorkRequest) => string;
  formatDate: (d: string | null) => string | null;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    data: { status: item.status },
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
        <Link href={`/work-requests/${item.id}`} className="min-w-0 flex-1 block">
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
            Assigned: {item.assigned_to?.full_name ?? "—"}
          </div>
          {formatDate(item.due_date) && (
            <div className="text-xs text-muted-foreground">
              Due: {formatDate(item.due_date)}
            </div>
          )}
        </Link>
      </Card>
    </div>
  );
}

export function WorkRequestBoard() {
  const { session } = useAuth();
  const [items, setItems] = useState<WorkRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canDrag, setCanDrag] = useState(false);

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
          assigned_to:profiles!work_requests_assigned_to_fk(id, full_name),
          field_events ( clients ( name ), programs ( name ) )
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
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const newStatus = String(over.id);
      if (!STATUSES.includes(newStatus)) return;
      const wrId = String(active.id);
      const item = items.find((i) => i.id === wrId);
      if (!item || item.status === newStatus) return;

      const prevItems = items;
      setItems((prev) =>
        prev.map((i) => (i.id === wrId ? { ...i, status: newStatus } : i))
      );

      const { error: updErr } = await supabase
        .from("work_requests")
        .update({ status: newStatus })
        .eq("id", wrId);

      if (updErr) {
        setItems(prevItems);
        toast.error("Failed to update status", {
          description: updErr.message,
        });
      }
    },
    [items]
  );

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : null;

  const getClientName = (item: WorkRequest) =>
    item.field_events?.clients?.name ?? "No client";

  const getProgramName = (item: WorkRequest) =>
    item.field_events?.programs?.name ?? "—";

  const renderCard = (item: WorkRequest) => (
    <WRCard
      key={item.id}
      item={item}
      getClientName={getClientName}
      getProgramName={getProgramName}
      formatDate={formatDate}
      canDrag={canDrag}
    />
  );

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">
          Error loading work requests: {error}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STATUSES.map((status) => {
            const filtered =
              error != null
                ? []
                : items.filter((item) => item.status === status);
            return (
              <StatusColumn
                key={status}
                status={status}
                items={filtered}
                getClientName={getClientName}
                getProgramName={getProgramName}
                formatDate={formatDate}
                canDrag={canDrag}
                renderCard={renderCard}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
