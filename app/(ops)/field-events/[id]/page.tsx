"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
] as const;

const PRIORITY_NONE = "__none__";
const LEAD_NONE = "__none__";
const ASSIGNED_NONE = "__none__";

const FOLLOWUP_STATUSES = [
  { value: "open", label: "Open" },
  { value: "done", label: "Closed" },
] as const;

const ISSUE_TYPES = [
  { value: "Leak", label: "Leak" },
  { value: "New Valve", label: "New Valve" },
] as const;

const DUE_IN_NONE = "__none__";
const DUE_IN_OPTIONS = [
  { value: DUE_IN_NONE, label: "—" },
  { value: "1_month", label: "1 month" },
  { value: "2_months", label: "2 months" },
  { value: "90_days", label: "90 days" },
] as const;

function getDueDateFromOption(value: string): string | null {
  if (value === DUE_IN_NONE) return null;
  const d = new Date();
  if (value === "1_month") d.setMonth(d.getMonth() + 1);
  else if (value === "2_months") d.setMonth(d.getMonth() + 2);
  else if (value === "90_days") d.setDate(d.getDate() + 90);
  else return null;
  return d.toISOString().slice(0, 10);
}
const PRIORITIES = [
  { value: PRIORITY_NONE, label: "—" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

type FieldEventDetail = {
  id: string;
  client_id: string | null;
  program_id: string | null;
  lead_id: string | null;
  name: string;
  status: string;
  event_type: string | null;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  clients: { name: string } | null;
  programs: { name: string } | null;
  lead: { full_name: string } | null;
};

type Profile = { id: string; full_name: string | null };
type Program = { id: string; name: string };

type ValveFollowup = {
  id: string;
  tag: string | null;
  issue_type: string | null;
  status: string;
  notes: string | null;
  due_date: string | null;
  closed_at: string | null;
  created_at: string | null;
  assigned_to: { full_name: string | null } | null;
};

function AddFollowUpModal({
  event,
  profiles,
  onClose,
  onSuccess,
}: {
  event: FieldEventDetail;
  profiles: Profile[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const [tag, setTag] = useState("");
  const [issueType, setIssueType] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("open");
  const [assignedToId, setAssignedToId] = useState(ASSIGNED_NONE);
  const [dueIn, setDueIn] = useState(DUE_IN_NONE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tag.trim()) {
      setError("Tag is required.");
      return;
    }
    if (!issueType.trim()) {
      setError("Issue type is required.");
      return;
    }
    setSubmitting(true);

    const dueDate = getDueDateFromOption(dueIn);

    const { data: inserted, error: insertErr } = await supabase
      .from("valve_followups")
      .insert({
        client_id: event.client_id,
        program_id: event.program_id ?? null,
        tag: tag.trim(),
        issue_type: issueType,
        notes: notes.trim() || null,
        status,
        due_date: dueDate,
        assigned_to: assignedToId === ASSIGNED_NONE ? null : assignedToId,
        created_by: session?.user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertErr) {
      setSubmitting(false);
      setError(insertErr.message);
      return;
    }

    if (inserted) {
      const userId = session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setSubmitting(false);
        setError("You must be signed in to create a follow-up event.");
        return;
      }

      const { error: eventErr } = await supabase
        .from("valve_followup_events")
        .insert({
          followup_id: inserted.id,
          action: "created",
          field_event_id: event.id,
          created_by: userId,
        });

      if (eventErr) {
        setSubmitting(false);
        setError(eventErr.message);
        return;
      }
    }

    setSubmitting(false);
    await onSuccess();
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Follow-Up</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tag</label>
            <Input
              className="mt-1"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. valve tag number"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Issue type</label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Due in</label>
            <Select value={dueIn} onValueChange={setDueIn}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select due period" />
              </SelectTrigger>
              <SelectContent>
                {DUE_IN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Assigned to (optional)</label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASSIGNED_NONE}>—</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFieldEventModal({
  event,
  onClose,
  onSuccess,
}: {
  event: FieldEventDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(event.name);
  const [status, setStatus] = useState(event.status);
  const [startDate, setStartDate] = useState(
    event.start_date?.slice(0, 10) ?? ""
  );
  const [endDate, setEndDate] = useState(event.end_date?.slice(0, 10) ?? "");
  const [leadId, setLeadId] = useState(event.lead_id ?? LEAD_NONE);
  const [programId, setProgramId] = useState(event.program_id ?? "");
  const [priority, setPriority] = useState(
    event.priority ?? PRIORITY_NONE
  );

  useEffect(() => {
    async function load() {
      const [profilesRes, programsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("role", ["tech", "manager"])
          .order("full_name"),
        event.client_id
          ? supabase
              .from("programs")
              .select("id, name")
              .eq("client_id", event.client_id)
              .order("name")
          : Promise.resolve({ data: [] }),
      ]);
      setProfiles((profilesRes.data ?? []) as Profile[]);
      setPrograms((programsRes.data ?? []) as Program[]);
    }
    load();
  }, [event.client_id]);

  const hasPrograms = programs.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (hasPrograms && !programId) {
      setError("Program is required for this client.");
      return;
    }
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      lead_id: leadId === LEAD_NONE ? null : leadId,
      priority: priority === PRIORITY_NONE ? null : priority,
      program_id: hasPrograms ? (programId || null) : null,
    };

    const { error: err } = await supabase
      .from("field_events")
      .update(payload)
      .eq("id", event.id);

    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSuccess();
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Field Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Lead (optional)</label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LEAD_NONE}>—</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Start date</label>
            <Input
              type="date"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">End date</label>
            <Input
              type="date"
              className="mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {hasPrograms && (
            <div>
              <label className="text-sm font-medium">Program</label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                (hasPrograms && !programId)
              }
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FieldEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { session } = useAuth();
  const [event, setEvent] = useState<FieldEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isTechOrManager, setIsTechOrManager] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [followups, setFollowups] = useState<ValveFollowup[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("field_events")
        .select(
          "id, client_id, program_id, lead_id, name, status, event_type, priority, start_date, end_date, clients(name), programs(name), lead:profiles!field_events_lead_id_fkey(full_name)"
        )
        .eq("id", id)
        .single();

      setLoading(false);

      if (err) {
        setError(err.message);
        return;
      }

      setEvent(data as unknown as FieldEventDetail);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        const role = (profile as { role?: string } | null)?.role;
        setIsManager(role === "manager");
        setIsTechOrManager(role === "manager" || role === "tech");
      }
    }

    load();
  }, [id]);

  useEffect(() => {
    const clientId = event?.client_id;
    if (!clientId || !isTechOrManager) {
      setFollowups([]);
      setProfiles([]);
      return;
    }
    async function loadFollowupsAndProfiles() {
      const query = supabase
        .from("valve_followups")
        .select("id, tag, issue_type, status, notes, due_date, closed_at, created_at, assigned_to(full_name)")
        .eq("client_id", clientId);
      
      if (!showClosed) {
        query.eq("status", "open");
      } else {
        query.eq("status", "done");
      }
      
      const [fuRes, profRes] = await Promise.all([
        query.order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("role", ["tech", "manager"])
          .order("full_name"),
      ]);
      console.log("followups debug", {
        clientId,
        dataCount: fuRes.data?.length,
        error: fuRes.error,
      });
      setFollowups((fuRes.data ?? []) as unknown as ValveFollowup[]);
      setProfiles((profRes.data ?? []) as Profile[]);
    }
    loadFollowupsAndProfiles();
  }, [event?.client_id, isTechOrManager, showClosed]);

  const BackButton = () => (
    <Button variant="outline" size="sm" asChild>
      <Link href="/dashboard">
        <ChevronLeft className="size-4" />
        Back to dashboard
      </Link>
    </Button>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p>Event not found.</p>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <BackButton />
        {isManager && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-sm text-muted-foreground">Client: </span>
          <span>{event.clients?.name ?? "—"}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Program: </span>
          <span>{event.programs?.name ?? "—"}</span>
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

      {isTechOrManager && event.client_id && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Valve Follow-Ups</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClosed(!showClosed)}
              >
                {showClosed ? "Hide closed" : "Show closed"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFollowUpOpen(true)}
              >
                <Plus className="size-4" />
                Add Follow-Up
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {showClosed
                  ? "No follow-ups for this client."
                  : "No open follow-ups for this client."}
              </p>
            ) : (
              <div className="rounded-md border">
                <div className="divide-y">
                  {followups.map((fu) => {
                    const clientId = event?.client_id;
                    async function handleStatusChange(nextStatus: string) {
                      const followupId = fu.id;
                      console.log("handleStatusChange inputs", { followupId, nextStatus });
                      if (!clientId) return;

                      const { data: updateData, error } = await supabase
                        .from("valve_followups")
                        .update({
                          status: nextStatus,
                          closed_at: nextStatus === "done" ? new Date().toISOString() : null,
                        })
                        .eq("id", followupId)
                        .select()
                        .single();

                      console.log("followup update result", { data: updateData, error });

                      if (error) {
                        console.error(error);
                        return;
                      }

                      // Refresh the list
                      const query = supabase
                        .from("valve_followups")
                        .select("id, tag, issue_type, status, notes, due_date, closed_at, created_at, assigned_to(full_name)")
                        .eq("client_id", clientId);
                      
                      if (!showClosed) {
                        query.eq("status", "open");
                      } else {
                        query.eq("status", "done");
                      }
                      
                      const { data: refreshed } = await query.order("created_at", { ascending: false });
                      setFollowups((refreshed ?? []) as unknown as ValveFollowup[]);
                    }

                    return (
                      <div
                        key={fu.id}
                        className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {fu.tag ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {fu.issue_type ?? "—"}
                            </span>
                            <Select
                              value={fu.status}
                              onValueChange={handleStatusChange}
                            >
                              <SelectTrigger className="h-6 w-auto px-1.5 py-0.5 text-xs border-0 shadow-none bg-muted text-muted-foreground hover:bg-muted/80">
                                <SelectValue>
                                  {fu.status === "open" ? "Open" : "Closed"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {FOLLOWUP_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {fu.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {fu.notes}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Assigned: {fu.assigned_to?.full_name ?? "—"} · Created:{" "}
                            {fu.created_at
                              ? new Date(fu.created_at).toLocaleDateString()
                              : "—"}
                            {fu.due_date && (
                              <> · Due: {new Date(fu.due_date).toLocaleDateString()}</>
                            )}
                            {fu.closed_at && (
                              <> · Closed: {new Date(fu.closed_at).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editOpen && (
        <EditFieldEventModal
          event={event}
          onClose={() => setEditOpen(false)}
          onSuccess={async () => {
            const { data } = await supabase
              .from("field_events")
              .select(
                "id, client_id, program_id, lead_id, name, status, event_type, priority, start_date, end_date, clients(name), programs(name), lead:profiles!field_events_lead_id_fkey(full_name)"
              )
              .eq("id", id)
              .single();
            if (data) setEvent(data as unknown as FieldEventDetail);
          }}
        />
      )}

      {addFollowUpOpen && (
        <AddFollowUpModal
          event={event}
          profiles={profiles}
          onClose={() => setAddFollowUpOpen(false)}
          onSuccess={async () => {
            if (!event.client_id) return;
            const query = supabase
              .from("valve_followups")
              .select("id, tag, issue_type, status, notes, due_date, closed_at, created_at, assigned_to(full_name)")
              .eq("client_id", event.client_id);
            
            if (!showClosed) {
              query.eq("status", "open");
            } else {
              query.eq("status", "done");
            }
            
            const { data: followupData, error: followupError } = await query.order("created_at", { ascending: false });
            console.log("followups debug", {
              clientId: event.client_id,
              dataCount: followupData?.length,
              error: followupError,
            });
            setFollowups((followupData ?? []) as unknown as ValveFollowup[]);
          }}
        />
      )}
    </div>
  );
}
