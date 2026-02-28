import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { applyGridDraftEdits } from "@/lib/services/deals";
import { gridEditSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);

    const body = await request.json();
    const updates = gridEditSchema.parse(body);

    return applyGridDraftEdits({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      dealId: id,
      updates,
    });
  });
}
