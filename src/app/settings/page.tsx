import type { Prisma } from "@prisma/client";
import { getUserContext } from "@/lib/auth/session";
import { SetupRequired } from "@/components/setup-required";
import { prisma } from "@/lib/db/prisma";

export default async function SettingsPage() {
  let setupMessage: string | null = null;
  let workspace: Prisma.WorkspaceGetPayload<{
    include: { memberships: true };
  }> | null = null;

  try {
    const ctx = await getUserContext();

    workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      include: {
        memberships: {
          where: { active: true },
        },
      },
    });

  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!workspace) {
    if (setupMessage) {
      return <SetupRequired message={setupMessage} />;
    }
    return <p className="text-sm text-slate-600">Workspace not found.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Administration</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h2>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Sync Policy</h3>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>
            End-of-day auto-sync: <strong>{workspace.eodSyncEnabled ? "Enabled" : "Disabled"}</strong>
          </p>
          <p>
            EOD time: <strong>{workspace.eodSyncTimeLocal}</strong> ({workspace.timezone})
          </p>
          <p>
            Conflict policy: <strong>Block on conflict</strong>
          </p>
          <p>
            Stale threshold: <strong>{workspace.staleDays} days</strong>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Team Roles</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {workspace.memberships.map((membership) => (
            <li key={`${membership.userId}-${membership.workspaceId}`} className="rounded-lg border border-slate-200 px-3 py-2">
              {membership.userId} — {membership.role}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
