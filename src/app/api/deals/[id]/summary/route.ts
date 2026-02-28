import { NextRequest } from "next/server";

import { getUserContext } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { applySummaryDraftEdits } from "@/lib/services/deals";
import { summaryPatchSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const { id } = await context.params;
    const ctx = await getUserContext(request);
    const body = await request.json();
    const parsed = summaryPatchSchema.parse(body);

    return applySummaryDraftEdits({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      dealId: id,
      fields: parsed.fields,
    });
  });
}
