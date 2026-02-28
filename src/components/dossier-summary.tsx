"use client";

import { useMemo, useState } from "react";

import type { DealSnapshotDTO, ModuleDTO } from "@/lib/types/contracts";

type Lens = "AE" | "SE";

function lensFields(lens: Lens): Array<{ key: string; label: string }> {
  if (lens === "SE") {
    return [
      { key: "technicalScope", label: "Technical Scope" },
      { key: "integrationRequirements", label: "Integration Requirements" },
      { key: "securityStatus", label: "Security/Compliance Status" },
      { key: "technicalBlockers", label: "Technical Blockers" },
    ];
  }

  return [
    { key: "champion", label: "Champion" },
    { key: "competition", label: "Competition" },
    { key: "risks", label: "Risks" },
    { key: "mutualPlanMilestone", label: "Mutual Plan Milestone" },
  ];
}

export function DossierSummary({
  dealId,
  deal,
  modules,
  lens,
}: {
  dealId: string;
  deal: DealSnapshotDTO;
  modules: ModuleDTO[];
  lens: Lens;
}) {
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [topLevel, setTopLevel] = useState<Record<string, string>>({
    nextStep: deal.nextStep ?? "",
    closeDate: deal.closeDate?.slice(0, 10) ?? "",
    amount: deal.amount ? String(deal.amount) : "",
  });

  const [moduleValues, setModuleValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const section of modules) {
      for (const field of section.fields) {
        initial[`${section.id}:${field.id}`] = field.value ? String(field.value) : "";
      }
    }

    return initial;
  });

  const roleFields = useMemo(() => lensFields(lens), [lens]);

  async function save() {
    setSaving(true);
    setStatus("");

    const summaryFields = [
      {
        fieldKey: "nextStep",
        value: topLevel.nextStep,
        baseValue: deal.nextStep,
      },
      {
        fieldKey: "closeDate",
        value: topLevel.closeDate ? new Date(topLevel.closeDate).toISOString() : null,
        baseValue: deal.closeDate,
      },
    ];

    const modulePatches = modules.flatMap((section) =>
      section.fields.map((field) => ({
        fieldKey: `module.${field.key}`,
        value: moduleValues[`${section.id}:${field.id}`] ?? "",
        dealModuleId: section.id,
        templateFieldId: field.id,
      })),
    );

    const response = await fetch(`/api/deals/${dealId}/summary`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [...summaryFields, ...modulePatches],
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (response.ok) {
      setStatus("Summary saved as draft changes.");
    } else {
      setStatus(payload.error ?? "Failed to save summary.");
    }

    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Deal Summary ({lens} Lens)</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Account
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              value={deal.accountName}
              disabled
            />
          </label>

          <label className="text-sm text-slate-700">
            Next Step
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              value={topLevel.nextStep}
              onChange={(event) => {
                setTopLevel((previous) => ({ ...previous, nextStep: event.target.value }));
              }}
            />
          </label>

          <label className="text-sm text-slate-700">
            Close Date
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              type="date"
              value={topLevel.closeDate}
              onChange={(event) => {
                setTopLevel((previous) => ({ ...previous, closeDate: event.target.value }));
              }}
            />
          </label>

          <label className="text-sm text-slate-700">
            Amount
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              value={topLevel.amount}
              onChange={(event) => {
                setTopLevel((previous) => ({ ...previous, amount: event.target.value }));
              }}
            />
          </label>

          {roleFields.map((field) => (
            <label key={field.key} className="text-sm text-slate-700">
              {field.label}
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                onChange={(event) => {
                  setTopLevel((previous) => ({
                    ...previous,
                    [field.key]: event.target.value,
                  }));
                }}
                value={topLevel[field.key] ?? ""}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Modules</h3>
        {modules.map((section) => (
          <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">{section.title}</h4>
              <p className="text-xs text-slate-500">
                Last updated {new Date(section.lastUpdatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {section.fields.map((field) => {
                const fieldId = `${section.id}:${field.id}`;
                return (
                  <label key={field.id} className="text-sm text-slate-700">
                    {field.label}
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                      value={moduleValues[fieldId] ?? ""}
                      onChange={(event) => {
                        setModuleValues((previous) => ({
                          ...previous,
                          [fieldId]: event.target.value,
                        }));
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {status && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          onClick={() => {
            void save();
          }}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Summary Draft"}
        </button>
      </div>
    </div>
  );
}
