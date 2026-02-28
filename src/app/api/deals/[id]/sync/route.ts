import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { requestSync } from "@/lib/services/deals";
import { syncExecuteSchema } from "@/lib/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);

    const body = await request.json().catch(() => ({}));
    const parsed = syncExecuteSchema.parse(body);

    return requestSync({
      workspaceId: ctx.workspaceId,
      dealId: id,
      actorUserId: ctx.userId,
      includeContextRefresh: parsed.includeContextRefresh,
    });
  });
}
