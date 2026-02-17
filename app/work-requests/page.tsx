"use client";

import Link from "next/link";
import { WorkRequestBoard } from "@/components/work-requests/WorkRequestBoard";

export default function WorkRequestsPage() {
  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Work Requests</h1>
        <p className="text-sm text-muted-foreground">
          Status overview across all clients.
        </p>
      </div>
      <WorkRequestBoard />
    </div>
  );
}
