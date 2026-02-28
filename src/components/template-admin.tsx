"use client";

import { useState } from "react";

import type { TemplateDTO } from "@/lib/types/contracts";

const roleOptions = ["AE", "SE", "SDR", "MANAGER", "ADMIN"] as const;

export function TemplateAdmin({ initialTemplates }: { initialTemplates: TemplateDTO[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("AE");
  const [status, setStatus] = useState("");

  async function createTemplate() {
    setStatus("");

    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        role,
        active: true,
        modules: [
          {
            key: "summary",
            title: "Summary",
            requiredByDefault: true,
            sortOrder: 0,
            fields: [
              {
                key: "next_step",
                label: "Next Step",
                type: "TEXT",
                options: [],
                crmPropertyName: "next_step",
                sortOrder: 0,
              },
            ],
          },
        ],
        stageRequirements: [],
      }),
    });

    const payload = (await response.json()) as TemplateDTO | { error?: string };

    if (response.ok) {
      setTemplates((previous) => [payload as TemplateDTO, ...previous]);
      setName("");
      setStatus("Template created.");
    } else {
      setStatus((payload as { error?: string }).error ?? "Unable to create template.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Template Builder</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            Template name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="AE - MEDDICC Lite"
            />
          </label>

          <label className="text-sm text-slate-700">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as (typeof roleOptions)[number]);
              }}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              onClick={() => {
                void createTemplate();
              }}
            >
              Create Template
            </button>
          </div>
        </div>
        {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
      </section>

      <section className="space-y-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">{template.name}</h4>
                <p className="text-sm text-slate-500">Role: {template.role}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100">
                {template.active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {template.modules.map((module) => (
                <div key={module.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">{module.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Fields: {module.fields.length}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                    {module.fields.map((field) => (
                      <li key={field.id}>{field.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
