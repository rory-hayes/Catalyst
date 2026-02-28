import { Queue } from "bullmq";

import { env } from "@/lib/config/env";

export const REFRESH_QUEUE = "refresh-deal";
export const SYNC_QUEUE = "sync-deal";

export const queueConnection = {
  url: env.REDIS_URL,
} as const;

let refreshQueueInstance: Queue<RefreshJobPayload> | null = null;
let syncQueueInstance: Queue<SyncJobPayload> | null = null;

export interface RefreshJobPayload {
  workspaceId: string;
  dealId: string;
  actorUserId?: string;
}

export interface SyncJobPayload {
  workspaceId: string;
  dealId: string;
  syncJobId: string;
  actorUserId?: string;
  includeContextRefresh: boolean;
}

function getRefreshQueue(): Queue<RefreshJobPayload> {
  if (!refreshQueueInstance) {
    refreshQueueInstance = new Queue(REFRESH_QUEUE, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: {
          type: "exponential",
          delay: 500,
        },
      },
    });
  }

  return refreshQueueInstance;
}

function getSyncQueue(): Queue<SyncJobPayload> {
  if (!syncQueueInstance) {
    syncQueueInstance = new Queue(SYNC_QUEUE, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 100,
        backoff: {
          type: "exponential",
          delay: 500,
        },
      },
    });
  }

  return syncQueueInstance;
}

export async function enqueueRefreshDeal(payload: RefreshJobPayload): Promise<void> {
  await getRefreshQueue().add(`refresh-${payload.dealId}`, payload);
}

export async function enqueueSyncDeal(payload: SyncJobPayload): Promise<void> {
  await getSyncQueue().add(`sync-${payload.syncJobId}-${payload.dealId}`, payload);
}
