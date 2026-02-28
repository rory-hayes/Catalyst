import { DossierSummary } from "@/components/dossier-summary";
import { RefreshButton } from "@/components/refresh-button";
import { SetupRequired } from "@/components/setup-required";
import { StatusBadge } from "@/components/status-badge";
import { SyncPreviewModal } from "@/components/sync-preview-modal";
import { Timeline } from "@/components/timeline";
import { UpdateComposer } from "@/components/update-composer";
import { getUserContext } from "@/lib/auth/session";
import { formatDateDisplay } from "@/lib/format/date-display";
import { getDealDossier } from "@/lib/services/deals";
import { getDefaultLens } from "@/lib/services/workspaces";

export default async function DealDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lens?: string }>;
}) {
  let setupMessage: string | null = null;
  let dossier: Awaited<ReturnType<typeof getDealDossier>> | null = null;

  try {
    const ctx = await getUserContext();
    const { id } = await params;
    const resolvedSearch = await searchParams;
    const defaultLens = getDefaultLens(ctx.role);
    const lens = resolvedSearch.lens === "AE" || resolvedSearch.lens === "SE" ? resolvedSearch.lens : defaultLens;

    dossier = await getDealDossier(ctx.workspaceId, id, lens);
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!dossier) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Deal Dossier</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{dossier.deal.accountName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge label={dossier.deal.stage} variant="stage" />
              <StatusBadge label={dossier.deal.health} variant="health" />
              <span className="text-sm text-slate-600">
                Close: {formatDateDisplay(dossier.deal.closeDate, "TBD")}
              </span>
              <span className="text-sm text-slate-600">
                Amount: {dossier.deal.amount ? `$${new Intl.NumberFormat("en-US").format(dossier.deal.amount)}` : "-"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton dealId={dossier.deal.id} />
            <SyncPreviewModal dealId={dossier.deal.id} />
          </div>
        </div>

        {dossier.conflicts.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {dossier.conflicts.length} unresolved conflict(s) detected. Sync is blocked until resolved.
          </div>
        )}
      </header>

      <DossierSummary dealId={dossier.deal.id} deal={dossier.deal} modules={dossier.modules} lens={dossier.lens} />

      <UpdateComposer dealId={dossier.deal.id} />

      <Timeline items={dossier.timeline} />
    </div>
  );
}
