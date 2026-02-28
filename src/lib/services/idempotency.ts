import { createHash } from "crypto";

export function createWriteIdempotencyKey(params: {
  dealId: string;
  payload: unknown;
  now?: Date;
  bucketMinutes?: number;
}): string {
  const now = params.now ?? new Date();
  const bucketMinutes = params.bucketMinutes ?? 15;
  const bucketStart = Math.floor(now.getTime() / (bucketMinutes * 60 * 1000));
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(params.payload))
    .digest("hex")
    .slice(0, 16);

  return `${params.dealId}:${bucketStart}:${payloadHash}`;
}
