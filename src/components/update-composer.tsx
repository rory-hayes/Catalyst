"use client";

import { useState } from "react";

const updateTypeOptions = [
  { label: "Weekly update", value: "WEEKLY" },
  { label: "Meeting note", value: "MEETING" },
  { label: "Handoff update", value: "HANDOFF" },
] as const;

export function UpdateComposer({ dealId }: { dealId: string }) {
  const [type, setType] = useState<(typeof updateTypeOptions)[number]["value"]>("WEEKLY");
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [risks, setRisks] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextStepOverride, setNextStepOverride] = useState("");
  const [escalationText, setEscalationText] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setStatus("");

    const response = await fetch(`/api/deals/${dealId}/updates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        title,
        bodyMarkdown,
        risks: risks
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        blockers: blockers
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        nextStepOverride: nextStepOverride.trim() || null,
        escalationText: escalationText.trim() || null,
      }),
    });

    const payload = (await response.json()) as { id?: string; error?: string };

    if (response.ok) {
      setStatus("Update saved. It will be pushed on Sync.");
      setTitle("");
      setBodyMarkdown("");
      setRisks("");
      setBlockers("");
      setNextStepOverride("");
      setEscalationText("");
    } else {
      setStatus(payload.error ?? "Could not save update.");
    }

    setLoading(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Update Composer</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Update type
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={type}
            onChange={(event) => {
              setType(event.target.value as (typeof updateTypeOptions)[number]["value"]);
            }}
          >
            {updateTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Title
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Weekly checkpoint"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        What changed?
        <textarea
          className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
          value={bodyMarkdown}
          onChange={(event) => {
            setBodyMarkdown(event.target.value);
          }}
          placeholder="Write markdown update"
        />
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Risks (comma-separated)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={risks}
            onChange={(event) => {
              setRisks(event.target.value);
            }}
          />
        </label>

        <label className="text-sm text-slate-700">
          Blockers (comma-separated)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={blockers}
            onChange={(event) => {
              setBlockers(event.target.value);
            }}
          />
        </label>

        <label className="text-sm text-slate-700">
          Next step override (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={nextStepOverride}
            onChange={(event) => {
              setNextStepOverride(event.target.value);
            }}
          />
        </label>

        <label className="text-sm text-slate-700">
          Escalation ask (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
            value={escalationText}
            onChange={(event) => {
              setEscalationText(event.target.value);
            }}
          />
        </label>
      </div>

      {status && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          type="button"
          onClick={() => {
            void submit();
          }}
          disabled={loading}
        >
          {loading ? "Saving…" : "Save Draft Update"}
        </button>
      </div>
    </section>
  );
}
