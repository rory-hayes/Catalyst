import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/lib/db/prisma";
import { enqueueSyncDeal } from "@/lib/queue/client";
import { generateHygieneNotifications } from "@/lib/services/notifications";

export async function dispatchEodSyncJobs(now = new Date()): Promise<{
  queuedDeals: number;
  workspacesProcessed: number;
}> {
  const workspaces = await prisma.workspace.findMany({
    where: {
      eodSyncEnabled: true,
    },
  });

  let queuedDeals = 0;
  let workspacesProcessed = 0;

  for (const workspace of workspaces) {
    const dayOfWeek = Number(formatInTimeZone(now, workspace.timezone, "i"));
    if (dayOfWeek === 6 || dayOfWeek === 7) {
      continue;
    }

    const localTime = formatInTimeZone(now, workspace.timezone, "HH:mm");
    if (localTime !== workspace.eodSyncTimeLocal) {
      continue;
    }

    const deals = await prisma.deal.findMany({
      where: {
        workspaceId: workspace.id,
        draftFields: {
          some: { dirty: true },
        },
      },
      select: {
        id: true,
        ownerUserId: true,
      },
    });

    if (deals.length === 0) {
      await generateHygieneNotifications(workspace.id);
      continue;
    }

    const syncJob = await prisma.syncJob.create({
      data: {
        workspaceId: workspace.id,
        trigger: "EOD",
        status: "QUEUED",
      },
    });

    for (const deal of deals) {
      await prisma.syncJobItem.create({
        data: {
          syncJobId: syncJob.id,
          dealId: deal.id,
          status: "PENDING",
        },
      });

      await enqueueSyncDeal({
        workspaceId: workspace.id,
        dealId: deal.id,
        syncJobId: syncJob.id,
        actorUserId: deal.ownerUserId ?? undefined,
        includeContextRefresh: false,
      });

      queuedDeals += 1;
    }

    await generateHygieneNotifications(workspace.id);
    workspacesProcessed += 1;
  }

  return {
    queuedDeals,
    workspacesProcessed,
  };
}
