import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { toNotificationDTO } from "@/lib/services/mappers";
import type { NotificationDTO } from "@/lib/types/contracts";

export async function listNotifications(workspaceId: string, userId: string): Promise<NotificationDTO[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      workspaceId,
      userId,
      status: { not: "ARCHIVED" },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return notifications.map((notification) => toNotificationDTO(notification));
}

export async function markNotificationRead(
  workspaceId: string,
  userId: string,
  notificationId: string,
): Promise<{ updated: true }> {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      workspaceId,
      userId,
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  return { updated: true };
}

export async function generateHygieneNotifications(workspaceId: string): Promise<number> {
  const staleDeals = await prisma.deal.findMany({
    where: {
      workspaceId,
      OR: [
        { nextStep: null },
        { stale: true },
        { closeDate: { lt: new Date() } },
      ],
    },
    include: {
      owner: true,
      workspace: true,
    },
    take: 500,
  });

  const records: Prisma.NotificationCreateManyInput[] = staleDeals
    .filter((deal) => deal.ownerUserId)
    .map((deal) => ({
      workspaceId,
      userId: deal.ownerUserId as string,
      dealId: deal.id,
      type: "deal_hygiene_reminder",
      severity: deal.closeDate && deal.closeDate < new Date() ? "CRITICAL" : "WARNING",
      title: `${deal.accountName} needs attention`,
      body: deal.nextStep
        ? "Deal is stale or close date expired."
        : "Missing next step. Add one before end of day sync.",
      status: "UNREAD",
    }));

  if (records.length === 0) {
    return 0;
  }

  await prisma.notification.createMany({
    data: records,
  });

  return records.length;
}
