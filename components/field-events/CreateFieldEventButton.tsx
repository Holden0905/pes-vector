"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Client = { id: string; name: string };
type Program = { id: string; name: string };
type Profile = { id: string; full_name: string | null };

const EVENT_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi Annual" },
  { value: "annual", label: "Annual" },
  { value: "special_event", label: "Special Event" },
  { value: "linewalk", label: "Linewalk" },
] as const;

const PRIORITY_NONE = "__none__";
const LEAD_NONE = "__none__";
const PRIORITIES = [
  { value: PRIORITY_NONE, label: "—" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

type Props = { onSuccess?: () => void };

export function CreateFieldEventButton({ onSuccess }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [clientId, setClientId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("");
  const [leadId, setLeadId] = useState<string>(LEAD_NONE);
  const [priority, setPriority] = useState(PRIORITY_NONE);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      const role = (profile as { role?: string } | null)?.role;
      setIsManager(role === "manager");
      setLoading(false);
    }
    load();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!open) return;
    async function loadOptions() {
      const [clientsRes, profilesRes] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("role", ["tech", "manager"])
          .order("full_name"),
      ]);
      setClients((clientsRes.data ?? []) as Client[]);
      setProfiles((profilesRes.data ?? []) as Profile[]);
    }
    loadOptions();
  }, [open]);

  useEffect(() => {
    if (!open || !clientId) {
      setPrograms([]);
      setProgramId("");
      setProgramsLoading(false);
      return;
    }
    setProgramsLoading(true);
    async function loadPrograms() {
      const { data } = await supabase
        .from("programs")
        .select("id, name")
        .eq("client_id", clientId)
        .order("name");
      setPrograms((data ?? []) as Program[]);
      setProgramId("");
      setProgramsLoading(false);
    }
    loadPrograms();
  }, [open, clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId || !name.trim() || !eventType) {
      setError("Client, name, and event type are required.");
      return;
    }
    if (programs.length > 0 && !programId) return;
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      client_id: clientId,
      name: name.trim(),
      event_type: eventType,
      status: "not_started",
    };
    payload.priority = priority === PRIORITY_NONE ? null : priority;
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    payload.program_id = programId || null;
    payload.lead_id = leadId === LEAD_NONE ? null : leadId || null;

    const { error: err } = await supabase
      .from("field_events")
      .insert(payload)
      .select("id")
      .single();

    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }

    setOpen(false);
    setClientId("");
    setProgramId("");
    setName("");
    setEventType("");
    setLeadId(LEAD_NONE);
    setPriority(PRIORITY_NONE);
    setStartDate("");
    setEndDate("");
    onSuccess?.();
    router.refresh();
  }

  if (loading || !isManager) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Field Event</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Field Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Client</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {clientId && (
            <div>
              <label className="text-sm font-medium">
                Program {programs.length > 0 ? "" : "(optional)"}
              </label>
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
            <label className="text-sm font-medium">Name</label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Event name"
            />
          </div>
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
            <label className="text-sm font-medium">Event type</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Priority (optional)</label>
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
          <div>
            <label className="text-sm font-medium">Start date (optional)</label>
            <Input
              type="date"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">End date (optional)</label>
            <Input
              type="date"
              className="mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {clientId && programs.length > 0 && !programId && !error && (
            <p className="text-sm text-destructive">
              Program is required for this client.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                programsLoading ||
                (programs.length > 0 && !programId)
              }
            >
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
