"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClientFormModal,
  type ClientDetail,
} from "@/components/clients/ClientFormModal";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [clientRegulations, setClientRegulations] = useState<
    { regulations: { id: string; code: string } | null }[]
  >([]);
  const [clientMonitoringFrequencies, setClientMonitoringFrequencies] =
    useState<{ monitoring_frequencies: { id: string; code: string } | null }[]>(
      []
    );
  const [clientDatabaseType, setClientDatabaseType] = useState<{
    database_types: { id: string; code: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("clients")
        .select("id, name, active, primary_contact_name, primary_contact_email, primary_contact_phone, ppe, monitoring_frequencies, database_type, notes")
        .eq("id", id)
        .single();
      if (err) {
        setLoading(false);
        setError(err.message);
        return;
      }
      setClient(data as unknown as ClientDetail);

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

      const { data: regData } = await supabase
        .from("client_regulations")
        .select(`
          regulations (
            id,
            code
          )
        `)
        .eq("client_id", id);
      setClientRegulations((regData ?? []) as { regulations: { id: string; code: string } | null }[]);

      const { data: mfData } = await supabase
        .from("client_monitoring_frequencies")
        .select("monitoring_frequencies ( id, code )")
        .eq("client_id", id)
        .order("code", {
          foreignTable: "monitoring_frequencies",
          ascending: true,
        });
      setClientMonitoringFrequencies(
        (mfData ?? []) as {
          monitoring_frequencies: { id: string; code: string } | null;
        }[]
      );

      const { data: dbTypeData } = await supabase
        .from("client_database_types")
        .select("database_types ( id, code )")
        .eq("client_id", id)
        .maybeSingle();
      setClientDatabaseType(dbTypeData as { database_types: { id: string; code: string } | null } | null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/clients">
            <ChevronLeft className="size-4" />
            Back to Clients
          </Link>
        </Button>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/clients">
            <ChevronLeft className="size-4" />
            Back to Clients
          </Link>
        </Button>
        <p>{error ?? "Client not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/clients">
          <ChevronLeft className="size-4" />
          Back to Clients
        </Link>
      </Button>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{client.name ?? "—"}</h1>
          {client.active === true && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">
              Active
            </span>
          )}
        </div>
        {isManager && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Edit Client
          </Button>
        )}
      </div>

      <div className="space-y-6 max-w-2xl">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Primary Contact
          </h2>
          <div className="space-y-1 text-sm">
            <div>Name: {client.primary_contact_name ?? "—"}</div>
            <div>
              Email:{" "}
              {client.primary_contact_email ? (
                <a
                  href={`mailto:${client.primary_contact_email}`}
                  className="text-primary hover:underline"
                >
                  {client.primary_contact_email}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div>
              Phone:{" "}
              {client.primary_contact_phone ? (
                <a
                  href={`tel:${client.primary_contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {client.primary_contact_phone}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">PPE</h2>
          {client.ppe ? (
            <p className="text-sm whitespace-pre-wrap">{client.ppe}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Regulations
          </h2>
          {clientRegulations.filter((r) => r.regulations?.code).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {clientRegulations
                .filter((r) => r.regulations?.code)
                .map((r) => (
                  <Badge key={r.regulations!.id} variant="secondary">
                    {r.regulations!.code}
                  </Badge>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No regulations assigned.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Monitoring Frequency
          </h2>
          {clientMonitoringFrequencies.filter(
            (r) => r.monitoring_frequencies?.code
          ).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {clientMonitoringFrequencies
                .filter((r) => r.monitoring_frequencies?.code)
                .map((r) => (
                  <Badge key={r.monitoring_frequencies!.id} variant="secondary">
                    {r.monitoring_frequencies!.code}
                  </Badge>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No monitoring frequency assigned.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Database Type
          </h2>
          {clientDatabaseType?.database_types?.code ? (
            <Badge variant="secondary">
              {clientDatabaseType.database_types.code}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">
              No database type assigned.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Notes
          </h2>
          {client.notes ? (
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
        </section>
      </div>

      {editOpen && client && (
        <ClientFormModal
          mode="edit"
          client={client}
          onClose={() => setEditOpen(false)}
          onSuccess={async () => {
            const { data, error: err } = await supabase
              .from("clients")
              .select("id, name, active, primary_contact_name, primary_contact_email, primary_contact_phone, ppe, monitoring_frequencies, database_type, notes")
              .eq("id", id)
              .single();
            if (!err && data) setClient(data as unknown as ClientDetail);
            const { data: dbTypeData } = await supabase
              .from("client_database_types")
              .select("database_types ( id, code )")
              .eq("client_id", id)
              .maybeSingle();
            setClientDatabaseType(dbTypeData as { database_types: { id: string; code: string } | null } | null);
            const { data: mfData } = await supabase
              .from("client_monitoring_frequencies")
              .select("monitoring_frequencies ( id, code )")
              .eq("client_id", id)
              .order("code", {
                foreignTable: "monitoring_frequencies",
                ascending: true,
              });
            setClientMonitoringFrequencies(
              (mfData ?? []) as {
                monitoring_frequencies: { id: string; code: string } | null;
              }[]
            );
            const { data: regData } = await supabase
              .from("client_regulations")
              .select("regulations ( id, code )")
              .eq("client_id", id)
              .order("code", {
                foreignTable: "regulations",
                ascending: true,
              });
            setClientRegulations(
              (regData ?? []) as {
                regulations: { id: string; code: string } | null;
              }[]
            );
          }}
        />
      )}
    </div>
  );
}
