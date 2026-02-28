import { Worker } from "bullmq";

import {
  queueConnection,
  REFRESH_QUEUE,
  SYNC_QUEUE,
  type RefreshJobPayload,
  type SyncJobPayload,
} from "@/lib/queue/client";
import { processRefreshJob, processSyncJob } from "@/lib/services/deals";

const refreshWorker = new Worker<RefreshJobPayload>(
  REFRESH_QUEUE,
  async (job) => {
    await processRefreshJob(job.data);
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

const syncWorker = new Worker<SyncJobPayload>(
  SYNC_QUEUE,
  async (job) => {
    await processSyncJob(job.data);
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

refreshWorker.on("failed", (job, err) => {
  console.error("Refresh job failed", {
    jobId: job?.id,
    dealId: job?.data.dealId,
    error: err.message,
  });
});

syncWorker.on("failed", (job, err) => {
  console.error("Sync job failed", {
    jobId: job?.id,
    dealId: job?.data.dealId,
    error: err.message,
  });
});

console.log("Blueprint workers started", {
  queues: [REFRESH_QUEUE, SYNC_QUEUE],
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down workers`);
  await Promise.all([refreshWorker.close(), syncWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
