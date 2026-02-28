import { describe, expect, it } from "vitest";

import { createWriteIdempotencyKey } from "../../lib/services/idempotency";

describe("createWriteIdempotencyKey", () => {
  it("is deterministic for identical payload in same bucket", () => {
    const now = new Date("2026-02-28T12:10:00.000Z");
    const payload = { patch: { next_step: "Follow up" } };

    const first = createWriteIdempotencyKey({ dealId: "deal_1", payload, now, bucketMinutes: 15 });
    const second = createWriteIdempotencyKey({ dealId: "deal_1", payload, now, bucketMinutes: 15 });

    expect(first).toEqual(second);
  });

  it("changes across logical buckets", () => {
    const payload = { patch: { next_step: "Follow up" } };

    const first = createWriteIdempotencyKey({
      dealId: "deal_1",
      payload,
      now: new Date("2026-02-28T12:10:00.000Z"),
      bucketMinutes: 15,
    });

    const second = createWriteIdempotencyKey({
      dealId: "deal_1",
      payload,
      now: new Date("2026-02-28T12:40:00.000Z"),
      bucketMinutes: 15,
    });

    expect(first).not.toEqual(second);
  });
});
