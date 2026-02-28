import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

function asJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function trackMetric(params: {
  workspaceId: string;
  userId?: string;
  eventName: string;
  payload?: unknown;
}): Promise<void> {
  await prisma.metricEvent.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      eventName: params.eventName,
      payloadJson: asJson(params.payload),
    },
  });
}

export async function trackAudit(params: {
  workspaceId: string;
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      payloadJson: asJson(params.payload),
    },
  });
}
