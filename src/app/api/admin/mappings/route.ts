import { NextRequest } from "next/server";

import { getUserContext, requireRole } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { updateFieldMapping } from "@/lib/services/templates";
import { mappingSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    requireRole(ctx, ["ADMIN"]);

    const body = await request.json();
    const parsed = mappingSchema.parse(body);

    return updateFieldMapping(ctx.workspaceId, parsed.templateFieldId, parsed.crmPropertyName);
  });
}
