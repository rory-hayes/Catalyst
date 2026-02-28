"use client";

import { useState } from "react";

export function RefreshButton({ dealId }: { dealId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function refresh() {
    setLoading(true);
    setStatus("");

    const response = await fetch(`/api/deals/${dealId}/refresh`, {
      method: "POST",
    });

    const payload = (await response.json()) as { queued?: boolean; error?: string };

    if (response.ok && payload.queued) {
      setStatus("Refresh queued");
    } else {
      setStatus(payload.error ?? "Refresh failed");
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        type="button"
        onClick={() => {
          void refresh();
        }}
        disabled={loading}
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
    </div>
  );
}
