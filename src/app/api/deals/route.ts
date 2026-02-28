import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { listDeals } from "@/lib/services/deals";

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    return listDeals(ctx.workspaceId);
  });
}
