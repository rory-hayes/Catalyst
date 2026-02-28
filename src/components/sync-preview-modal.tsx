"use client";

import { useState } from "react";

import type { SyncPreviewDTO } from "@/lib/types/contracts";

export function SyncPreviewModal({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [includeContextRefresh, setIncludeContextRefresh] = useState(true);
  const [preview, setPreview] = useState<SyncPreviewDTO | null>(null);
  const [message, setMessage] = useState<string>("");

  async function loadPreview() {
    setLoading(true);
    const response = await fetch(`/api/deals/${dealId}/sync-preview`);
    const data = (await response.json()) as SyncPreviewDTO;
    setPreview(data);
    setLoading(false);
  }

  async function runSync() {
    setSyncing(true);
    setMessage("");

    const response = await fetch(`/api/deals/${dealId}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ includeContextRefresh }),
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (response.ok) {
      setMessage(data.message ?? "Sync requested.");
    } else {
      setMessage(data.error ?? "Sync failed.");
    }

    setSyncing(false);
  }

  return (
    <>
      <button
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        onClick={() => {
          setOpen(true);
          setPreview(null);
          void loadPreview();
        }}
        type="button"
      >
        Sync
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Sync Preview</h3>
              <button
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setOpen(false);
                }}
                type="button"
              >
                Close
              </button>
            </div>

            {loading && <p className="mt-4 text-sm text-slate-500">Loading preview…</p>}

            {!loading && preview && (
              <div className="mt-4 space-y-4 text-sm">
                <section>
                  <p className="font-semibold text-slate-800">Push to CRM</p>
                  <p className="mt-1 text-slate-600">Update fields: {preview.fieldsToUpdate.length}</p>
                  <p className="text-slate-600">Create CRM Note: 1</p>
                  <p className="text-slate-600">Create Tasks: {preview.tasksToCreate}</p>
                </section>

                <section>
                  <p className="font-semibold text-slate-800">Pull context</p>
                  <p className="mt-1 text-slate-600">Slack: {preview.pullContext.slackThreads} relevant threads</p>
                  <p className="text-slate-600">Gmail: {preview.pullContext.gmailThreads} recent threads</p>
                  <p className="text-slate-600">Gong: {preview.pullContext.gongSummaries} call summaries</p>
                  <p className="text-slate-600">Drive: {preview.pullContext.driveDocsUpdated} docs updated</p>
                </section>

                <section>
                  <p className="font-semibold text-slate-800">Field diff</p>
                  <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {preview.fieldsToUpdate.length === 0 && (
                      <p className="text-slate-500">No pending field changes.</p>
                    )}
                    {preview.fieldsToUpdate.map((field) => (
                      <div key={field.fieldKey} className="py-1">
                        <p className="font-medium text-slate-800">{field.fieldKey}</p>
                        <p className="text-xs text-slate-600">
                          {JSON.stringify(field.currentCrmValue)} → {JSON.stringify(field.localDraftValue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <label className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeContextRefresh}
                    onChange={(event) => {
                      setIncludeContextRefresh(event.target.checked);
                    }}
                  />
                  Also refresh connected tools
                </label>

                {preview.conflicts.length > 0 && (
                  <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">
                    Resolve {preview.conflicts.length} conflict(s) before sync.
                  </p>
                )}

                {message && (
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                    type="button"
                    onClick={() => {
                      void runSync();
                    }}
                    disabled={syncing || (preview?.conflicts.length ?? 0) > 0}
                  >
                    {syncing ? "Syncing…" : "Confirm Sync"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
