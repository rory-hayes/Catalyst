import { prisma } from "@/lib/db/prisma";
import { getUserContext } from "@/lib/auth/session";
import { SetupRequired } from "@/components/setup-required";

export default async function IntegrationsPage() {
  let setupMessage: string | null = null;
  let connections: Awaited<ReturnType<typeof prisma.crmConnection.findMany>> | null = null;

  try {
    const ctx = await getUserContext();

    connections = await prisma.crmConnection.findMany({
      where: {
        workspaceId: ctx.workspaceId,
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!connections) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Connectors</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Integrations</h2>
        <p className="mt-1 text-sm text-slate-600">
          HubSpot is the v1 source-of-record connector. Additional connectors are phased to later milestones.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">CRM Connections</h3>

        <div className="mt-3 space-y-3">
          {connections.map((connection) => (
            <article key={connection.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">{connection.provider}</p>
              <p className="mt-1 text-xs text-slate-600">Status: {connection.status}</p>
              <p className="text-xs text-slate-600">Scopes: {connection.scopes.join(", ") || "-"}</p>
            </article>
          ))}

          {connections.length === 0 && (
            <p className="text-sm text-slate-500">No CRM connection configured yet. Add HubSpot OAuth in settings.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Roadmap Connectors</h3>
        <p className="mt-2 text-sm text-slate-600">Salesforce, Calendar, Gong, and Drive are deferred to later phases.</p>
      </section>
    </div>
  );
}
