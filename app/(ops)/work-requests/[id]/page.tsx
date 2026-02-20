"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
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

function EditTimeEntryModal({
  entry,
  workTypes,
  profiles,
  onClose,
  onSave,
}: {
  entry: {
    id: string;
    work_type_id: string;
    user_id: string;
    work_date: string;
    hours: number;
    notes: string;
  };
  workTypes: { id: string; name: string | null }[];
  profiles: { id: string; full_name: string | null }[];
  onClose: () => void;
  onSave: (upd: {
    work_date: string;
    work_type_id: string;
    user_id: string;
    hours: number;
    notes: string;
  }) => Promise<void>;
}) {
  const USER_NONE = "__none__";
  const [workDate, setWorkDate] = useState(
    entry.work_date?.slice(0, 10) ?? ""
  );
  const [workTypeId, setWorkTypeId] = useState(entry.work_type_id);
  const [userId, setUserId] = useState(entry.user_id || USER_NONE);
  const [hours, setHours] = useState(String(entry.hours));
  const [notes, setNotes] = useState(entry.notes);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit time entry</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave({
              work_date: workDate,
              work_type_id: workTypeId,
              user_id: userId === USER_NONE ? "" : userId,
              hours: parseFloat(hours) || 0,
              notes,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              className="mt-1"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Technician</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_NONE}>—</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Work type</label>
            <Select value={workTypeId} onValueChange={setWorkTypeId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map((wt) => (
                  <SelectItem key={wt.id} value={wt.id}>
                    {wt.name ?? wt.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Hours</label>
            <Input
              type="number"
              step="0.1"
              className="mt-1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              className="mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const BUDGET_ORDER = ["Drafting", "Checking", "Database", "Project Manager"];

function sortWorkTypesForBudget<T extends { id: string; name: string | null }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const ai = BUDGET_ORDER.findIndex(
      (n) => n.toLowerCase() === (a.name ?? "").toLowerCase()
    );
    const bi = BUDGET_ORDER.findIndex(
      (n) => n.toLowerCase() === (b.name ?? "").toLowerCase()
    );
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (a.name ?? a.id).localeCompare(b.name ?? b.id);
  });
}

function SetBudgetModal({
  workRequestId,
  workTypes,
  budgetByTypeId,
  onClose,
  onSuccess,
}: {
  workRequestId: string;
  workTypes: { id: string; name: string | null }[];
  budgetByTypeId: Record<string, number>;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const sortedTypes = sortWorkTypesForBudget(workTypes);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    workTypes.forEach((wt) => {
      const b = budgetByTypeId[wt.id];
      v[wt.id] = b != null && b > 0 ? String(b) : "";
    });
    return v;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set budgets</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSaving(true);
            const rows = sortedTypes.map((wt) => ({
              work_request_id: workRequestId,
              work_type_id: wt.id,
              hours_budgeted: parseFloat(values[wt.id] || "0") || 0,
            }));
            const { error: upsErr } = await supabase
              .from("wr_budgets")
              .upsert(rows, {
                onConflict: "work_request_id,work_type_id",
              });
            setSaving(false);
            if (upsErr) {
              setError(upsErr.message);
              return;
            }
            await onSuccess();
          }}
          className="space-y-4"
        >
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    Work Type
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Hours Budgeted
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTypes.map((wt) => (
                  <tr key={wt.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{wt.name ?? wt.id}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-24 text-right"
                        value={values[wt.id] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [wt.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTimeModal({
  workRequestId,
  workTypes,
  profiles,
  isManager,
  currentUserId,
  onClose,
  onSuccess,
}: {
  workRequestId: string;
  workTypes: { id: string; name: string | null }[];
  profiles: { id: string; full_name: string | null }[];
  isManager: boolean;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workDate, setWorkDate] = useState(today);
  const [workTypeId, setWorkTypeId] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState(currentUserId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add time entry</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const h = parseFloat(hours);
            if (!workDate || !workTypeId || !hours || isNaN(h) || h <= 0) {
              setError("Date, work type, and hours (greater than 0) are required.");
              return;
            }
            if (isManager && !userId) {
              setError("Please select a technician.");
              return;
            }
            setSaving(true);
            const uid = isManager ? userId : currentUserId;
            const { error: insErr } = await supabase
              .from("time_entries")
              .insert({
                work_request_id: workRequestId,
                user_id: uid || null,
                work_type_id: workTypeId,
                work_date: workDate,
                hours: h,
                notes: notes.trim() || null,
              });
            setSaving(false);
            if (insErr) {
              setError(insErr.message);
              return;
            }
            await onSuccess();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              className="mt-1"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          {isManager && (
            <div>
              <label className="text-sm font-medium">Technician</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Work type</label>
            <Select value={workTypeId} onValueChange={setWorkTypeId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map((wt) => (
                  <SelectItem key={wt.id} value={wt.id}>
                    {wt.name ?? wt.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Hours</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              className="mt-1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    programs: { name: string } | null;
  } | null;
  wr_assignees: { user_id: string }[] | null;
};

export default function WorkRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { session } = useAuth();
  const [item, setItem] = useState<WorkRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoursData, setHoursData] = useState<{
    workTypes: { id: string; name: string | null }[];
    profiles: { id: string; full_name: string | null }[];
    budgetByTypeId: Record<string, number>;
    usedByTypeId: Record<string, number>;
    timeEntries: {
      id: string;
      work_type_id: string;
      user_id: string | null;
      work_date: string | null;
      hours: number;
      notes: string | null;
      created_at: string | null;
      work_types: { name: string | null } | null;
      profiles: { full_name: string | null } | null;
    }[];
  } | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    id: string;
    work_type_id: string;
    user_id: string;
    work_date: string;
    hours: number;
    notes: string;
  } | null>(null);
  const [teError, setTeError] = useState<string | null>(null);
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  async function loadHoursData() {
    const [wtRes, profRes, budRes, teRes] = await Promise.all([
      supabase.from("work_types").select("id,name").order("name"),
      supabase.from("profiles").select("id,full_name").order("full_name"),
      supabase
        .from("wr_budgets")
        .select("work_type_id,hours_budgeted")
        .eq("work_request_id", id),
      supabase
        .from("time_entries")
        .select(
          "id, work_type_id, user_id, work_date, hours, notes, created_at, work_types(name), profiles(full_name)"
        )
        .eq("work_request_id", id)
        .order("work_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    const workTypes = (wtRes.data ?? []) as { id: string; name: string | null }[];
    const profiles = (profRes.data ?? []) as { id: string; full_name: string | null }[];
    const budgets = (budRes.data ?? []) as {
      work_type_id: string;
      hours_budgeted: number;
    }[];
    const entries = (teRes.data ?? []) as unknown as {
      id: string;
      work_type_id: string;
      user_id: string | null;
      work_date: string | null;
      hours: number;
      notes: string | null;
      created_at: string | null;
      work_types: { name: string | null } | null;
      profiles: { full_name: string | null } | null;
    }[];
    const budgetByTypeId: Record<string, number> = {};
    budgets.forEach((b) => {
      budgetByTypeId[b.work_type_id] =
        (budgetByTypeId[b.work_type_id] ?? 0) + (b.hours_budgeted ?? 0);
    });
    const usedByTypeId: Record<string, number> = {};
    entries.forEach((e) => {
      usedByTypeId[e.work_type_id] =
        (usedByTypeId[e.work_type_id] ?? 0) + (e.hours ?? 0);
    });
    setHoursData({
      workTypes,
      profiles,
      budgetByTypeId,
      usedByTypeId,
      timeEntries: entries,
    });
  }

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("work_requests")
        .select(
          "id, field_event_id, wr_number, status, priority, due_date, notes, primary_owner:profiles!work_requests_primary_owner_id_fkey(full_name), field_events(id, name, clients(name), programs(name)), wr_assignees(user_id)"
        )
        .eq("id", id)
        .single();

      if (err) {
        setLoading(false);
        if (err.code === "PGRST116") {
          notFound();
          return;
        }
        setError(err.message);
        return;
      }

      if (!data) {
        setLoading(false);
        notFound();
        return;
      }

      setItem(data as unknown as WorkRequestDetail);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", user.id)
          .single();
        setIsManager((profile as { role?: string } | null)?.role === "manager");
      }

      await loadHoursData();
      setLoading(false);
    }

    load();
  }, [id, session?.user?.id]);

  const BackButton = () => (
    <Button variant="outline" size="sm" asChild>
      <Link href="/work-requests">
        <ChevronLeft className="size-4" />
        Back to Work Requests
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

  if (!item) {
    return (
      <div className="space-y-4">
        <BackButton />
        <p>Loading...</p>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";
  const clientName = item.field_events?.clients?.name ?? "—";
  const programName = item.field_events?.programs?.name ?? "—";
  const fieldEventName = item.field_events?.name ?? "—";
  const hasAssignees =
    item.wr_assignees != null && item.wr_assignees.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <BackButton />
        {item.field_event_id && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/field-events/${item.field_event_id}`}>
              View Field Event
            </Link>
          </Button>
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
          <span className="text-sm text-muted-foreground">Program: </span>
          <span>{programName}</span>
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

      {hoursData && (() => {
        const NAME_FALLBACK = [
          "Drafting",
          "Checking",
          "Database",
          "Project Manager",
        ];
        const budgetTypeIds = new Set(Object.keys(hoursData.budgetByTypeId));
        const usedTypeIds = new Set(Object.keys(hoursData.usedByTypeId));
        const relevantTypes = hoursData.workTypes.filter(
          (wt) =>
            budgetTypeIds.has(wt.id) ||
            usedTypeIds.has(wt.id) ||
            (wt.name &&
              NAME_FALLBACK.some(
                (n) => n.toLowerCase() === wt.name?.toLowerCase()
              ))
        );
        const sortedRelevant = sortWorkTypesForBudget(relevantTypes);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hours</h2>
              {isManager && (
                <Button size="sm" onClick={() => setBudgetModalOpen(true)}>
                  Set Budgets
                </Button>
              )}
            </div>
            {sortedRelevant.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hours data yet.</p>
            ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">
                      Work Type
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Hours Used
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Hours Budgeted
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Hours Left
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRelevant.map((wt) => {
                    const budget =
                      hoursData.budgetByTypeId[wt.id] ?? 0;
                    const used = hoursData.usedByTypeId[wt.id] ?? 0;
                    const left = budget - used;
                    return (
                      <tr key={wt.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{wt.name ?? wt.id}</td>
                        <td className="px-3 py-2 text-right">
                          {used.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {budget.toFixed(1)}
                        </td>
                        <td
                          className={
                            left < 0
                              ? "px-3 py-2 text-right text-destructive"
                              : "px-3 py-2 text-right"
                          }
                        >
                          {left.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );
      })()}

      {hoursData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Time entries</h2>
            <Button size="sm" onClick={() => setAddTimeOpen(true)}>
              Add Time
            </Button>
          </div>
          {teError && (
            <p className="text-sm text-destructive">{teError}</p>
          )}
          {hoursData.timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No time entries yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Technician
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Work Type
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Hours
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                    {isManager && (
                      <th className="px-3 py-2 text-left font-medium">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {hoursData.timeEntries.map((te) => (
                    <tr key={te.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {te.work_date
                          ? new Date(te.work_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {te.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {te.work_types?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(te.hours ?? 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2">
                        {te.notes ?? "—"}
                      </td>
                      {isManager && (
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                setEditingEntry({
                                  id: te.id,
                                  work_type_id: te.work_type_id,
                                  user_id: te.user_id ?? "",
                                  work_date: te.work_date ?? "",
                                  hours: te.hours ?? 0,
                                  notes: te.notes ?? "",
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={async () => {
                                if (
                                  !window.confirm("Delete this time entry?")
                                )
                                  return;
                                setTeError(null);
                                const { error: delErr } = await supabase
                                  .from("time_entries")
                                  .delete()
                                  .eq("id", te.id);
                                if (delErr) {
                                  setTeError(delErr.message);
                                  return;
                                }
                                await loadHoursData();
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {budgetModalOpen && hoursData && (
        <SetBudgetModal
          workRequestId={id}
          workTypes={hoursData.workTypes}
          budgetByTypeId={hoursData.budgetByTypeId}
          onClose={() => setBudgetModalOpen(false)}
          onSuccess={async () => {
            setBudgetModalOpen(false);
            await loadHoursData();
          }}
        />
      )}

      {addTimeOpen && hoursData && (
        <AddTimeModal
          workRequestId={id}
          workTypes={hoursData.workTypes}
          profiles={hoursData.profiles}
          isManager={isManager}
          currentUserId={session?.user?.id ?? ""}
          onClose={() => setAddTimeOpen(false)}
          onSuccess={async () => {
            setAddTimeOpen(false);
            await loadHoursData();
          }}
        />
      )}

      {editingEntry && hoursData && (
        <EditTimeEntryModal
          entry={editingEntry}
          workTypes={hoursData.workTypes}
          profiles={hoursData.profiles}
          onClose={() => setEditingEntry(null)}
          onSave={async (upd) => {
            setTeError(null);
            const { error: updErr } = await supabase
              .from("time_entries")
              .update({
                work_date: upd.work_date || null,
                work_type_id: upd.work_type_id || null,
                hours: upd.hours,
                notes: upd.notes || null,
                user_id: upd.user_id || null,
              })
              .eq("id", editingEntry.id);
            if (updErr) {
              setTeError(updErr.message);
              return;
            }
            setEditingEntry(null);
            await loadHoursData();
          }}
        />
      )}
    </div>
  );
}
