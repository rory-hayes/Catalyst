import { TemplateAdmin } from "@/components/template-admin";
import { SetupRequired } from "@/components/setup-required";
import { getUserContext } from "@/lib/auth/session";
import { listTemplates } from "@/lib/services/templates";

export default async function TemplatesPage() {
  let setupMessage: string | null = null;
  let templates: Awaited<ReturnType<typeof listTemplates>> | null = null;

  try {
    const ctx = await getUserContext();
    templates = await listTemplates(ctx.workspaceId);
  } catch (error) {
    setupMessage = error instanceof Error ? error.message : "Unknown setup error";
  }

  if (!templates) {
    return <SetupRequired message={setupMessage ?? "Infrastructure is not configured."} />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RevOps</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Templates & Lenses</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure module schemas, stage requirements, and CRM field mappings.
        </p>
      </header>

      <TemplateAdmin initialTemplates={templates} />
    </div>
  );
}
