import { addDays, endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/db/prisma";
import { getNeedsAttentionQueues, listDeals } from "@/lib/services/deals";
import type { DashboardDTO } from "@/lib/types/contracts";

export type DashboardRange = "last_week" | "this_month" | "this_quarter";

function resolveRange(range: DashboardRange): { start: Date; end: Date } {
  const now = new Date();

  if (range === "last_week") {
    return {
      start: startOfDay(addDays(now, -7)),
      end: endOfDay(now),
    };
  }

  if (range === "this_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(now),
    };
  }

  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return {
    start: new Date(now.getFullYear(), quarterStartMonth, 1),
    end: endOfDay(now),
  };
}

export async function getDashboardData(
  workspaceId: string,
  range: DashboardRange,
): Promise<DashboardDTO> {
  const windowRange = resolveRange(range);
  const deals = await listDeals(workspaceId);

  const pipelineWindowDeals = await prisma.deal.findMany({
    where: {
      workspaceId,
      closeDate: {
        gte: windowRange.start,
        lte: windowRange.end,
      },
    },
    select: { amount: true },
  });

  const totalPipeline = deals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
  const pipelineInWindow = pipelineWindowDeals.reduce((sum, deal) => sum + (deal.amount ? Number(deal.amount) : 0), 0);

  const needsUpdate = deals.filter((deal) => !deal.nextStep || deal.stale).length;
  const atRisk = deals.filter((deal) => deal.health !== "GREEN").length;

  const queues = await getNeedsAttentionQueues(workspaceId);

  return {
    cards: [
      {
        key: "totalPipeline",
        label: "Total Pipeline",
        value: totalPipeline,
      },
      {
        key: "pipelineInWindow",
        label: "Pipeline In Window",
        value: pipelineInWindow,
      },
      {
        key: "needsUpdate",
        label: "Deals Needing Update",
        value: needsUpdate,
      },
      {
        key: "atRisk",
        label: "At-Risk Deals",
        value: atRisk,
      },
    ],
    deals,
    staleQueue: queues.staleQueue,
    escalationQueue: queues.escalationQueue,
  };
}
