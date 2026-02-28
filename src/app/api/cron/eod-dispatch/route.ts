import { NextRequest } from "next/server";

import { env } from "@/lib/config/env";
import { jsonError, withRouteErrorHandling } from "@/lib/services/api";
import { dispatchEodSyncJobs } from "@/lib/services/cron";
import { recomputeHealthAndStaleForWorkspace } from "@/lib/services/deals";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${env.CRON_SECRET}`;

  if (authHeader !== expected) {
    return jsonError("Unauthorized", 401);
  }

  return withRouteErrorHandling(async () => {
    const dispatchResult = await dispatchEodSyncJobs(new Date());

    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
    });

    for (const workspace of workspaces) {
      await recomputeHealthAndStaleForWorkspace(workspace.id);
    }

    return dispatchResult;
  });
}
