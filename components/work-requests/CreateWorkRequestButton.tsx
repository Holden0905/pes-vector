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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldEventOption = {
  id: string;
  name: string | null;
  clients: { name: string } | null;
};

type ProfileOption = {
  id: string;
  full_name: string | null;
};

const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "drafting", label: "Drafting" },
  { value: "checking", label: "Checking" },
  { value: "database", label: "Database" },
  { value: "ready_to_close", label: "Ready to close" },
  { value: "complete", label: "Complete" },
] as const;

const PRIORITY_NONE = "__none__";
const PRIORITIES = [
  { value: PRIORITY_NONE, label: "—" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const OWNER_NONE = "__none__";

type Props = { onSuccess?: () => void };

export function CreateWorkRequestButton({ onSuccess }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [fieldEvents, setFieldEvents] = useState<FieldEventOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fieldEventId, setFieldEventId] = useState("");
  const [fieldEventPopoverOpen, setFieldEventPopoverOpen] = useState(false);
  const [wrNumber, setWrNumber] = useState("");
  const [status, setStatus] = useState("not_started");
  const [priority, setPriority] = useState(PRIORITY_NONE);
  const [dueDate, setDueDate] = useState("");
  const [primaryOwnerId, setPrimaryOwnerId] = useState(OWNER_NONE);
  const [assignToMe, setAssignToMe] = useState(false);

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
      const [feRes, profRes] = await Promise.all([
        supabase
          .from("field_events")
          .select("id, name, clients(name)")
          .order("name"),
        supabase.from("profiles").select("id, full_name").order("full_name"),
      ]);
      setFieldEvents((feRes.data ?? []) as unknown as FieldEventOption[]);
      setProfiles((profRes.data ?? []) as unknown as ProfileOption[]);
    }
    loadOptions();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fieldEventId || !wrNumber.trim()) {
      setError("Field event and WR number are required.");
      return;
    }
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      field_event_id: fieldEventId,
      wr_number: wrNumber.trim(),
      status,
      priority: priority === PRIORITY_NONE ? null : priority,
      due_date: dueDate || null,
      primary_owner_id: primaryOwnerId === OWNER_NONE ? null : primaryOwnerId,
    };

    const { data: created, error: err } = await supabase
      .from("work_requests")
      .insert(payload)
      .select("id")
      .single();

    if (err) {
      setSubmitting(false);
      setError(err.message);
      return;
    }

    if (assignToMe && created?.id && session?.user?.id) {
      await supabase.from("wr_assignees").insert({
        work_request_id: created.id,
        user_id: session.user.id,
      });
    }

    setSubmitting(false);
    setOpen(false);
    setFieldEventId("");
    setWrNumber("");
    setStatus("not_started");
    setPriority(PRIORITY_NONE);
    setDueDate("");
    setPrimaryOwnerId(OWNER_NONE);
    setAssignToMe(false);
    onSuccess?.();
    router.refresh();
  }

  if (loading || !isManager) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Work Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Work Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Field Event</label>
            <Popover
              open={fieldEventPopoverOpen}
              onOpenChange={setFieldEventPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fieldEventPopoverOpen}
                  className="mt-1 w-full justify-between font-normal"
                >
                  {(() => {
                    const fe = fieldEvents.find((e) => e.id === fieldEventId);
                    return fe
                      ? `${fe.clients?.name ?? "?"} - ${fe.name ?? "?"}`
                      : "Select field event";
                  })()}
                  <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command
                  filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }
                >
                  <CommandInput placeholder="Search field events…" />
                  <CommandList>
                    <CommandEmpty>No field event found.</CommandEmpty>
                    <CommandGroup>
                      {fieldEvents.map((fe) => {
                        const label = `${fe.clients?.name ?? "?"} - ${fe.name ?? "?"}`;
                        return (
                          <CommandItem
                            key={fe.id}
                            value={label}
                            onSelect={() => {
                              setFieldEventId(fe.id);
                              setFieldEventPopoverOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={
                                fieldEventId === fe.id
                                  ? "mr-2 size-4 opacity-100"
                                  : "mr-2 size-4 opacity-0"
                              }
                            />
                            {label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium">WR number</label>
            <Input
              className="mt-1"
              value={wrNumber}
              onChange={(e) => setWrNumber(e.target.value)}
              placeholder="WR number"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status (optional)</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
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
            <label className="text-sm font-medium">Due date (optional)</label>
            <Input
              type="date"
              className="mt-1"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Primary owner (optional)
            </label>
            <Select value={primaryOwnerId} onValueChange={setPrimaryOwnerId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OWNER_NONE}>—</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="assign-to-me"
              checked={assignToMe}
              onChange={(e) => setAssignToMe(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="assign-to-me" className="text-sm">
              Assign to me
            </label>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
