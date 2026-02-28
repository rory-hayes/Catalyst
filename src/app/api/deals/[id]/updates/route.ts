import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { createDealUpdate } from "@/lib/services/deals";
import { dealUpdateSchema } from "@/lib/validation/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);
    const body = await request.json();
    const parsed = dealUpdateSchema.parse(body);

    return createDealUpdate({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      dealId: id,
      ...parsed,
    });
  });
}
