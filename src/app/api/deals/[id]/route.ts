import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { getDealDossier } from "@/lib/services/deals";
import { getDefaultLens } from "@/lib/services/workspaces";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);
    const lensParam = request.nextUrl.searchParams.get("lens");

    const lens = lensParam === "AE" || lensParam === "SE" ? lensParam : getDefaultLens(ctx.role);
    return getDealDossier(ctx.workspaceId, id, lens);
  });
}
