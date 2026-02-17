"use client";

import { useState } from "react";
import { WorkRequestBoard } from "@/components/work-requests/WorkRequestBoard";
import { CreateWorkRequestButton } from "@/components/work-requests/CreateWorkRequestButton";

export default function WorkRequestsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Work Requests</h1>
          <p className="text-sm text-muted-foreground">
            Status overview across all clients.
          </p>
        </div>
        <CreateWorkRequestButton
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <WorkRequestBoard key={refreshKey} />
    </div>
  );
}
