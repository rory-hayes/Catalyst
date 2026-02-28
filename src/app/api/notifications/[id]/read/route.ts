import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { markNotificationRead } from "@/lib/services/notifications";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    const { id } = await context.params;

    return markNotificationRead(ctx.workspaceId, ctx.userId, id);
  });
}
