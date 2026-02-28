import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { getDashboardData, type DashboardRange } from "@/lib/services/dashboard";

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    const rangeParam = request.nextUrl.searchParams.get("range") as DashboardRange | null;
    const range: DashboardRange =
      rangeParam === "last_week" || rangeParam === "this_month" || rangeParam === "this_quarter"
        ? rangeParam
        : "this_quarter";

    return getDashboardData(ctx.workspaceId, range);
  });
}
