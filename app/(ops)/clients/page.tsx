"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { toast } from "sonner";

type Client = {
  id: string;
  name: string;
  active: boolean | null;
  database_type: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [regsByClientId, setRegsByClientId] = useState<Record<string, string[]>>({});
  const [freqsByClientId, setFreqsByClientId] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        const role = (profile as { role?: string } | null)?.role;
        setIsManager(role === "manager");
      }
    }
    loadRole();
  }, []);

  useEffect(() => {
    async function load() {
      setFetchError(null);
      const [clientsRes, regsRes, freqsRes] = await Promise.all([
        supabase.from("clients").select("id, name, active, database_type, primary_contact_name, primary_contact_email, primary_contact_phone").order("name"),
        supabase
          .from("client_regulations")
          .select("client_id, regulations ( code )"),
        supabase
          .from("client_monitoring_frequencies")
          .select("client_id, monitoring_frequencies ( code )"),
      ]);
      if (clientsRes.error) {
        setFetchError(clientsRes.error.message);
        return;
      }
      setClients((clientsRes.data ?? []) as unknown as Client[]);

      const regMap: Record<string, string[]> = {};
      for (const r of regsRes.data ?? []) {
        const row = r as { client_id: string; regulations: { code: string } | null };
        const code = row.regulations?.code;
        if (code && row.client_id) {
          if (!regMap[row.client_id]) regMap[row.client_id] = [];
          regMap[row.client_id].push(code);
        }
      }
      setRegsByClientId(regMap);

      const freqMap: Record<string, string[]> = {};
      for (const f of freqsRes.data ?? []) {
        const row = f as {
          client_id: string;
          monitoring_frequencies: { code: string } | null;
        };
        const code = row.monitoring_frequencies?.code;
        if (code && row.client_id) {
          if (!freqMap[row.client_id]) freqMap[row.client_id] = [];
          freqMap[row.client_id].push(code);
        }
      }
      setFreqsByClientId(freqMap);
    }
    load();
  }, [listRefreshKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.trim().toLowerCase();
    return clients.filter((c) => c.name?.toLowerCase().includes(q));
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Client directory and configuration.
          </p>
        </div>
        {isManager && (
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="size-4" />
            Add Client
          </Button>
        )}
      </div>

      <Input
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {fetchError && (
        <p className="text-sm text-destructive">Error loading clients: {fetchError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`} className="block">
            <Card className="h-full transition-colors hover:bg-accent/50 py-4">
              <CardContent className="p-4 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{client.name ?? "—"}</h2>
                  {client.active === true && (
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">
                      Active
                    </span>
                  )}
                </div>
                {(client.primary_contact_name ||
                  client.primary_contact_email ||
                  client.primary_contact_phone) && (
                  <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                    {client.primary_contact_name && (
                      <div>{client.primary_contact_name}</div>
                    )}
                    {(client.primary_contact_email || client.primary_contact_phone) && (
                      <div>
                        {client.primary_contact_email}
                        {client.primary_contact_email && client.primary_contact_phone && " • "}
                        {client.primary_contact_phone}
                      </div>
                    )}
                  </div>
                )}
                {client.database_type && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Database: {client.database_type}
                  </p>
                )}
                {(() => {
                  const regs = regsByClientId[client.id] ?? [];
                  const freqCodes = freqsByClientId[client.id] ?? [];
                  const hasRegs = regs.length > 0;
                  const hasFreqs = freqCodes.length > 0;
                  if (!hasRegs && !hasFreqs) return null;
                  const regVisible = regs.slice(0, 2);
                  const regRemaining = regs.length - regVisible.length;
                  const freqVisible = freqCodes.slice(0, 2);
                  const freqRemaining = freqCodes.length - freqVisible.length;
                  return (
                    <div className="mt-1 space-y-1">
                      {hasRegs && (
                        <div className="flex flex-wrap gap-1 items-center">
                          {regVisible.map((code, i) => (
                            <Badge key={`${client.id}-reg-${i}`} variant="secondary" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {regRemaining > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{regRemaining}
                            </Badge>
                          )}
                        </div>
                      )}
                      {hasFreqs && (
                        <div className="flex flex-wrap gap-1 items-center">
                          {freqVisible.map((code, i) => (
                            <Badge key={`${client.id}-freq-${i}`} variant="secondary" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {freqRemaining > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{freqRemaining}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && !fetchError && (
        <p className="text-sm text-muted-foreground">No clients found.</p>
      )}

      {addOpen && (
        <ClientFormModal
          mode="create"
          client={null}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            setListRefreshKey((k) => k + 1);
            toast.success("Client created", {
              description: "The client record has been successfully created.",
            });
          }}
        />
      )}
    </div>
  );
}
