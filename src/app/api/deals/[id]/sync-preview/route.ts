import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { buildSyncPreview } from "@/lib/services/deals";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);

    return buildSyncPreview(ctx.workspaceId, id);
  });
}
