import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { requestRefresh } from "@/lib/services/deals";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);

    return requestRefresh({
      workspaceId: ctx.workspaceId,
      dealId: id,
      actorUserId: ctx.userId,
    });
  });
}
