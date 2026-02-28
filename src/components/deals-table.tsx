"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { DealSnapshotDTO } from "@/lib/types/contracts";
import { StatusBadge } from "@/components/status-badge";
import { formatDateDisplay } from "@/lib/format/date-display";

type EditableField = "nextStep" | "closeDate";

export function DealsTable({
  deals,
  compact = false,
}: {
  deals: DealSnapshotDTO[];
  compact?: boolean;
}) {
  const [rows, setRows] = useState<DealSnapshotDTO[]>(deals);
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  const totalPending = useMemo(
    () => rows.reduce((count, row) => count + (row.pendingChanges > 0 ? 1 : 0), 0),
    [rows],
  );

  async function saveField(dealId: string, field: EditableField, value: string) {
    setSavingRows((previous) => new Set(previous).add(dealId));

    const payload = field === "nextStep" ? { nextStep: value } : { closeDate: value ? new Date(value).toISOString() : null };

    const response = await fetch(`/api/deals/${dealId}/grid-edit`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const updated = (await response.json()) as DealSnapshotDTO;
      setRows((previous) => previous.map((row) => (row.id === dealId ? updated : row)));
    }

    setSavingRows((previous) => {
      const next = new Set(previous);
      next.delete(dealId);
      return next;
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Deals</h3>
        <p className="text-xs text-slate-500">Pending rows: {totalPending}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Deal / Account</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Close Date</th>
              <th className="px-4 py-3">Next Step</th>
              {!compact && <th className="px-4 py-3">Last Activity</th>}
              <th className="px-4 py-3">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const saving = savingRows.has(row.id);

              return (
                <tr key={row.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/deals/${row.id}`} className="font-semibold text-slate-900 hover:underline">
                      {row.accountName}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.pendingChanges > 0 && <StatusBadge label="Pending" variant="pending" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={row.stage} variant="stage" />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.amount === null
                      ? "-"
                      : new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(row.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                      type="date"
                      defaultValue={row.closeDate?.slice(0, 10) ?? ""}
                      onBlur={(event) => {
                        void saveField(row.id, "closeDate", event.target.value);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                      type="text"
                      defaultValue={row.nextStep ?? ""}
                      placeholder="Add next step"
                      onBlur={(event) => {
                        void saveField(row.id, "nextStep", event.target.value.trim());
                      }}
                    />
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateDisplay(row.lastActivityAt, "No activity")}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={row.health} variant="health" />
                      {saving && <span className="text-xs text-slate-500">Saving…</span>}
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={compact ? 6 : 7}>
                  No deals found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
