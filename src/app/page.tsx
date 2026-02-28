import { KpiCard } from "@/components/kpi-card";
import { DealsTable } from "@/components/deals-table";
import { SetupRequired } from "@/components/setup-required";
import { getUserContext } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/dashboard";

export default async function HomePage() {
  let setupMessage: string | null = null;
  let ctx: Awaited<ReturnType<typeof getUserContext>> | null = null;
  let dashboard: Awaited<ReturnType<typeof getDashboardData>> | null = null;

  try {
    ctx = await getUserContext();
    dashboard = await getDashboardData(ctx.workspaceId, "this_quarter");
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!ctx || !dashboard) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blueprint Home</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Good afternoon, {ctx.email.split("@")[0]}</h2>
          <p className="mt-1 text-sm text-slate-600">System of engagement for deal execution and CRM hygiene.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          Range: This quarter
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.cards.map((card) => (
          <KpiCard key={card.key} label={card.label} value={card.value} />
        ))}
      </section>

      <DealsTable deals={dashboard.deals} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Stale Updates Queue</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.staleQueue.slice(0, 8).map((deal) => (
              <li key={deal.id} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700">
                {deal.accountName}
              </li>
            ))}
            {dashboard.staleQueue.length === 0 && <li className="text-slate-500">No stale deals.</li>}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Needs Escalation</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.escalationQueue.slice(0, 8).map((deal) => (
              <li key={deal.id} className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700">
                {deal.accountName}
              </li>
            ))}
            {dashboard.escalationQueue.length === 0 && <li className="text-slate-500">No escalations.</li>}
          </ul>
        </article>
      </section>
    </div>
  );
}
