import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { listNotifications } from "@/lib/services/notifications";

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    return listNotifications(ctx.workspaceId, ctx.userId);
  });
}
