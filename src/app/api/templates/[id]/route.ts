import { NextRequest } from "next/server";

import { getUserContext, requireRole } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { updateTemplate } from "@/lib/services/templates";
import { templateSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    requireRole(ctx, ["ADMIN"]);

    const { id } = await context.params;
    const body = await request.json();
    const parsed = templateSchema.parse(body);

    return updateTemplate(ctx.workspaceId, id, parsed);
  });
}
