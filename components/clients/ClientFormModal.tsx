"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export type ClientDetail = {
  id: string;
  name: string;
  active: boolean | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  ppe: string | null;
  monitoring_frequencies: string[] | null;
  database_type: string | null;
  notes: string | null;
};

const DB_TYPE_NONE = "__none__";

type DatabaseType = { id: string; code: string };
type MonitoringFrequency = { id: string; code: string };
type Regulation = { id: string; code: string };

export function ClientFormModal({
  mode,
  client,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  client: ClientDetail | null;
  onClose: () => void;
  onSuccess: (newClientId?: string) => void;
}) {
  const isCreate = mode === "create";
  const clientId = client?.id ?? null;

  const [name, setName] = useState(isCreate ? "" : (client?.name ?? ""));
  const [active, setActive] = useState(client?.active ?? true);
  const [primaryContactName, setPrimaryContactName] = useState(
    client?.primary_contact_name ?? ""
  );
  const [primaryContactEmail, setPrimaryContactEmail] = useState(
    client?.primary_contact_email ?? ""
  );
  const [primaryContactPhone, setPrimaryContactPhone] = useState(
    client?.primary_contact_phone ?? ""
  );
  const [ppe, setPpe] = useState(client?.ppe ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [databaseTypes, setDatabaseTypes] = useState<DatabaseType[]>([]);
  const [selectedDatabaseTypeId, setSelectedDatabaseTypeId] = useState<
    string | null
  >(null);
  const [monitoringFrequencies, setMonitoringFrequencies] = useState<
    MonitoringFrequency[]
  >([]);
  const [selectedMonitoringFrequencyIds, setSelectedMonitoringFrequencyIds] =
    useState<string[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedRegulationIds, setSelectedRegulationIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [typesRes, mfOptsRes, regOptsRes] = await Promise.all([
        supabase
          .from("database_types")
          .select("id, code")
          .eq("active", true)
          .order("code"),
        supabase
          .from("monitoring_frequencies")
          .select("id, code")
          .eq("active", true)
          .order("code"),
        supabase
          .from("regulations")
          .select("id, code")
          .eq("active", true)
          .order("code"),
      ]);
      setDatabaseTypes((typesRes.data ?? []) as DatabaseType[]);
      setMonitoringFrequencies((mfOptsRes.data ?? []) as MonitoringFrequency[]);
      setRegulations((regOptsRes.data ?? []) as Regulation[]);

      if (!clientId) return;

      const [currentDbRes, currentMfRes, currentRegRes] = await Promise.all([
        supabase
          .from("client_database_types")
          .select("database_type_id, database_types ( id, code )")
          .eq("client_id", clientId)
          .maybeSingle(),
        supabase
          .from("client_monitoring_frequencies")
          .select("monitoring_frequency_id")
          .eq("client_id", clientId),
        supabase
          .from("client_regulations")
          .select("regulation_id")
          .eq("client_id", clientId),
      ]);
      const row = currentDbRes.data as
        | { database_type_id: string; database_types: { id: string; code: string } | null }
        | null;
      if (row?.database_types?.id) {
        setSelectedDatabaseTypeId(row.database_types.id);
      } else {
        setSelectedDatabaseTypeId(null);
      }
      const mfRows = (currentMfRes.data ?? []) as { monitoring_frequency_id: string }[];
      setSelectedMonitoringFrequencyIds(mfRows.map((r) => r.monitoring_frequency_id));
      const regRows = (currentRegRes.data ?? []) as { regulation_id: string }[];
      setSelectedRegulationIds(regRows.map((r) => r.regulation_id));
    }
    load();
  }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const reportError = (msg: string) => {
      setError(msg);
      if (isCreate) toast.error("Error creating client", { description: msg });
    };

    let targetClientId = clientId;

    if (isCreate) {
      const nameTrimmed = name.trim();
      if (!nameTrimmed) {
        setSubmitting(false);
        reportError("Client name is required.");
        return;
      }
      const { data: inserted, error: insErr } = await supabase
        .from("clients")
        .insert({
          name: nameTrimmed,
          active,
          primary_contact_name: primaryContactName.trim() || null,
          primary_contact_email: primaryContactEmail.trim() || null,
          primary_contact_phone: primaryContactPhone.trim() || null,
          ppe: ppe.trim() || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (insErr) {
        setSubmitting(false);
        reportError(insErr.message);
        return;
      }
      targetClientId = (inserted as { id: string }).id;
    } else {
      const nameTrimmed = name.trim();
      if (!nameTrimmed) {
        setSubmitting(false);
        setError("Client name is required.");
        return;
      }
      const { error: err } = await supabase
        .from("clients")
        .update({
          name: nameTrimmed,
          active,
          primary_contact_name: primaryContactName.trim() || null,
          primary_contact_email: primaryContactEmail.trim() || null,
          primary_contact_phone: primaryContactPhone.trim() || null,
          ppe: ppe.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", client!.id);
      if (err) {
        setSubmitting(false);
        const isDuplicateName =
          (err as { code?: string }).code === "23505" ||
          /duplicate|unique/i.test(err.message);
        if (isDuplicateName) {
          setError("A client with that name already exists.");
          toast.error("Unable to rename client", {
            description: "A client with that name already exists.",
          });
        } else {
          reportError(err.message);
        }
        return;
      }
    }

    if (selectedDatabaseTypeId === null || selectedDatabaseTypeId === DB_TYPE_NONE) {
      const { error: dbErr } = await supabase
        .from("client_database_types")
        .delete()
        .eq("client_id", targetClientId!);
      if (dbErr) {
        setSubmitting(false);
        reportError(dbErr.message);
        return;
      }
    } else {
      const { error: dbErr } = await supabase
        .from("client_database_types")
        .upsert(
          {
            client_id: targetClientId!,
            database_type_id: selectedDatabaseTypeId,
          },
          { onConflict: "client_id" }
        );
      if (dbErr) {
        setSubmitting(false);
        reportError(dbErr.message);
        return;
      }
    }

    const { error: mfDelErr } = await supabase
      .from("client_monitoring_frequencies")
      .delete()
      .eq("client_id", targetClientId!);
    if (mfDelErr) {
      setSubmitting(false);
      reportError(mfDelErr.message);
      return;
    }
    if (selectedMonitoringFrequencyIds.length > 0) {
      const { error: mfInsErr } = await supabase
        .from("client_monitoring_frequencies")
        .insert(
          selectedMonitoringFrequencyIds.map((monitoring_frequency_id) => ({
            client_id: targetClientId!,
            monitoring_frequency_id,
          }))
        );
      if (mfInsErr) {
        setSubmitting(false);
        reportError(mfInsErr.message);
        return;
      }
    }

    const { error: regDelErr } = await supabase
      .from("client_regulations")
      .delete()
      .eq("client_id", targetClientId!);
    if (regDelErr) {
      setSubmitting(false);
      reportError(regDelErr.message);
      return;
    }
    if (selectedRegulationIds.length > 0) {
      const { error: regInsErr } = await supabase
        .from("client_regulations")
        .insert(
          selectedRegulationIds.map((regulation_id) => ({
            client_id: targetClientId!,
            regulation_id,
          }))
        );
      if (regInsErr) {
        setSubmitting(false);
        reportError(regInsErr.message);
        return;
      }
    }

    setSubmitting(false);
    onSuccess(isCreate ? targetClientId! : undefined);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add Client" : "Edit Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Client Name <span className="text-destructive">*</span>
            </label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="client-form-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="client-form-active" className="text-sm font-medium">
              Active
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">Primary Contact Name</label>
            <Input
              className="mt-1"
              value={primaryContactName}
              onChange={(e) => setPrimaryContactName(e.target.value)}
              placeholder="Contact name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Primary Contact Email</label>
            <Input
              type="email"
              className="mt-1"
              value={primaryContactEmail}
              onChange={(e) => setPrimaryContactEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Primary Contact Phone</label>
            <Input
              className="mt-1"
              value={primaryContactPhone}
              onChange={(e) => setPrimaryContactPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Monitoring Frequency</label>
            <div className="mt-1 flex flex-col gap-1.5 max-h-32 overflow-y-auto rounded-md border border-input px-3 py-2">
              {monitoringFrequencies.map((mf) => (
                <label
                  key={mf.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMonitoringFrequencyIds.includes(mf.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMonitoringFrequencyIds((prev) => [...prev, mf.id]);
                      } else {
                        setSelectedMonitoringFrequencyIds((prev) =>
                          prev.filter((id) => id !== mf.id)
                        );
                      }
                    }}
                    className="rounded border-input"
                  />
                  {mf.code}
                </label>
              ))}
              {monitoringFrequencies.length === 0 && (
                <span className="text-sm text-muted-foreground">No options</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Regulations</label>
            <div className="mt-1 flex flex-col gap-1.5 max-h-32 overflow-y-auto rounded-md border border-input px-3 py-2">
              {regulations.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRegulationIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRegulationIds((prev) => [...prev, r.id]);
                      } else {
                        setSelectedRegulationIds((prev) =>
                          prev.filter((id) => id !== r.id)
                        );
                      }
                    }}
                    className="rounded border-input"
                  />
                  {r.code}
                </label>
              ))}
              {regulations.length === 0 && (
                <span className="text-sm text-muted-foreground">No options</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Database Type</label>
            <Select
              value={selectedDatabaseTypeId ?? DB_TYPE_NONE}
              onValueChange={(v) =>
                setSelectedDatabaseTypeId(v === DB_TYPE_NONE ? null : v)
              }
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DB_TYPE_NONE}>— None —</SelectItem>
                {databaseTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    {dt.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">PPE</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={ppe}
              onChange={(e) => setPpe(e.target.value)}
              placeholder="PPE"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
