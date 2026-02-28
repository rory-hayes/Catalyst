import { NextRequest } from "next/server";

import { getUserContext, requireRole } from "@/lib/auth/session";
import { withRouteErrorHandling } from "@/lib/services/api";
import { createTemplate, listTemplates } from "@/lib/services/templates";
import { templateSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    return listTemplates(ctx.workspaceId);
  });
}

export async function POST(request: NextRequest) {
  return withRouteErrorHandling(async () => {
    const ctx = await getUserContext(request);
    requireRole(ctx, ["ADMIN"]);

    const body = await request.json();
    const parsed = templateSchema.parse(body);

    return createTemplate(ctx.workspaceId, parsed);
  });
}
