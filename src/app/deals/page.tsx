import { DealsTable } from "@/components/deals-table";
import { SetupRequired } from "@/components/setup-required";
import { getUserContext } from "@/lib/auth/session";
import { listDeals } from "@/lib/services/deals";

export default async function DealsPage() {
  let setupMessage: string | null = null;
  let deals: Awaited<ReturnType<typeof listDeals>> | null = null;

  try {
    const ctx = await getUserContext();
    deals = await listDeals(ctx.workspaceId);
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!deals) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Deals</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Deal Grid</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inline edits auto-save as drafts. CRM writes only occur on Sync.
        </p>
      </header>

      <DealsTable deals={deals} />
    </div>
  );
}
