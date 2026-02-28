import {
  CrmProvider,
  DealHealth,
  Prisma,
  SyncItemStatus,
  SyncStatus,
  SyncTrigger,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  createDealNote,
  getDealById,
  HubSpotConnectorError,
  updateDealProperties,
} from "@/lib/hubspot/client";
import { trackAudit, trackMetric } from "@/lib/metrics/events";
import { enqueueRefreshDeal, enqueueSyncDeal } from "@/lib/queue/client";
import { deriveHealth } from "@/lib/services/health";
import { createWriteIdempotencyKey } from "@/lib/services/idempotency";
import {
  toConflictDTO,
  toDealSnapshotDTO,
  toDealUpdateDTO,
  toDraftFieldDTO,
  toModuleDTO,
} from "@/lib/services/mappers";
import type {
  DealDossierDTO,
  DealSnapshotDTO,
  SyncExecutionResultDTO,
  SyncPreviewDTO,
  TimelineItemDTO,
} from "@/lib/types/contracts";

const TOP_LEVEL_SYNC_FIELDS = new Set(["nextStep", "nextStepDueDate", "closeDate", "stage"]);

type SummaryDraftFieldInput = {
  fieldKey: string;
  value: unknown;
  baseValue?: unknown;
  dealModuleId?: string;
  templateFieldId?: string;
};

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }

  return JSON.stringify(value);
}

function normalizeTopLevelCrmProperty(fieldKey: string, value: unknown): string | null {
  if (fieldKey === "closeDate" || fieldKey === "nextStepDueDate") {
    if (!value) {
      return null;
    }

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : String(date.getTime());
  }

  return serializeValue(value);
}

function toNullableJson(value: unknown) {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function createSyncNoteBody(params: {
  dealName: string;
  latestUpdate: {
    title: string;
    bodyMarkdown: string;
    createdAt: Date;
    creatorName: string;
  } | null;
  fields: Array<{ fieldKey: string; value: unknown }>;
}): string {
  const lines = [`Deal Update: ${params.dealName}`];

  if (params.latestUpdate) {
    lines.push(`Update type: ${params.latestUpdate.title}`);
    lines.push(`Updated by: ${params.latestUpdate.creatorName}`);
    lines.push(`Timestamp: ${params.latestUpdate.createdAt.toISOString()}`);
    lines.push("");
    lines.push(params.latestUpdate.bodyMarkdown);
    lines.push("");
  }

  if (params.fields.length > 0) {
    lines.push("Changed fields:");
    for (const field of params.fields) {
      lines.push(`- ${field.fieldKey}: ${JSON.stringify(field.value)}`);
    }
  }

  return lines.join("\n");
}

async function getHubSpotToken(workspaceId: string): Promise<string> {
  const connection = await prisma.crmConnection.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: CrmProvider.HUBSPOT,
      },
    },
  });

  if (!connection?.encryptedAccessToken) {
    throw new Error("HubSpot connection is missing for this workspace.");
  }

  return connection.encryptedAccessToken;
}

async function loadDealForWorkspace(workspaceId: string, dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      workspaceId,
    },
  });

  if (!deal) {
    throw new Error("Deal not found.");
  }

  return deal;
}

export async function listDeals(workspaceId: string): Promise<DealSnapshotDTO[]> {
  const deals = await prisma.deal.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: {
          draftFields: {
            where: { dirty: true },
          },
        },
      },
    },
    orderBy: [{ stale: "desc" }, { updatedAt: "desc" }],
  });

  return deals.map((deal) =>
    toDealSnapshotDTO({
      ...deal,
      pendingDraftCount: deal._count.draftFields,
    }),
  );
}

export async function getDealDossier(workspaceId: string, dealId: string, lens: "AE" | "SE"): Promise<DealDossierDTO> {
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      workspaceId,
    },
    include: {
      _count: {
        select: {
          draftFields: { where: { dirty: true } },
        },
      },
      modules: {
        include: {
          values: {
            include: {
              templateField: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      updates: {
        include: { creator: true },
        orderBy: { createdAt: "desc" },
      },
      conflicts: {
        where: { resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      },
      draftFields: {
        where: { dirty: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!deal) {
    throw new Error("Deal not found.");
  }

  const timeline: TimelineItemDTO[] = deal.updates.map((update) => ({
    id: update.id,
    source: "BLUEPRINT",
    title: update.title,
    body: update.bodyMarkdown,
    createdAt: update.createdAt.toISOString(),
  }));

  return {
    deal: toDealSnapshotDTO({ ...deal, pendingDraftCount: deal._count.draftFields }),
    lens,
    modules: deal.modules.map((module) => toModuleDTO(module)),
    updates: deal.updates.map((update) => toDealUpdateDTO(update)),
    timeline,
    conflicts: deal.conflicts.map((conflict) => toConflictDTO(conflict)),
    draftFields: deal.draftFields.map((draft) => toDraftFieldDTO(draft)),
  };
}

export async function applyGridDraftEdits(params: {
  workspaceId: string;
  userId: string;
  dealId: string;
  updates: Partial<{
    nextStep: string | null;
    nextStepDueDate: string | null;
    closeDate: string | null;
    stage: string;
  }>;
}): Promise<DealSnapshotDTO> {
  const deal = await loadDealForWorkspace(params.workspaceId, params.dealId);

  const now = new Date();
  const fieldMap: Record<string, unknown> = {
    nextStep: params.updates.nextStep,
    nextStepDueDate: params.updates.nextStepDueDate,
    closeDate: params.updates.closeDate,
    stage: params.updates.stage,
  };

  for (const [fieldKey, nextValue] of Object.entries(fieldMap)) {
    if (nextValue === undefined) {
      continue;
    }

    const baseValue =
      fieldKey === "nextStep"
        ? deal.nextStep
        : fieldKey === "nextStepDueDate"
          ? deal.nextStepDueDate?.toISOString() ?? null
          : fieldKey === "closeDate"
            ? deal.closeDate?.toISOString() ?? null
            : deal.stage;

    await prisma.dealDraftField.upsert({
        where: {
          dealId_fieldKey: {
            dealId: deal.id,
            fieldKey,
          },
        },
        update: {
          draftValueJson: toNullableJson(nextValue),
          baseCrmValueJson: toNullableJson(baseValue),
          dirty: true,
          updatedAt: now,
          updatedBy: params.userId,
        },
        create: {
          dealId: deal.id,
          fieldKey,
          draftValueJson: toNullableJson(nextValue),
          baseCrmValueJson: toNullableJson(baseValue),
          dirty: true,
          updatedAt: now,
          updatedBy: params.userId,
        },
      });
  }

  const updatedDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      nextStep: params.updates.nextStep ?? deal.nextStep,
      nextStepDueDate: params.updates.nextStepDueDate
        ? new Date(params.updates.nextStepDueDate)
        : params.updates.nextStepDueDate === null
          ? null
          : deal.nextStepDueDate,
      closeDate: params.updates.closeDate
        ? new Date(params.updates.closeDate)
        : params.updates.closeDate === null
          ? null
          : deal.closeDate,
      stage: params.updates.stage ?? deal.stage,
      lastBlueprintUpdatedAt: now,
    },
    include: {
      _count: {
        select: { draftFields: { where: { dirty: true } } },
      },
    },
  });

  await trackAudit({
    workspaceId: params.workspaceId,
    actorUserId: params.userId,
    eventType: "deal.grid_edit",
    entityType: "deal",
    entityId: deal.id,
    payload: params.updates,
  });

  await trackMetric({
    workspaceId: params.workspaceId,
    userId: params.userId,
    eventName: "grid_edit",
    payload: { dealId: deal.id },
  });

  return toDealSnapshotDTO({
    ...updatedDeal,
    pendingDraftCount: updatedDeal._count.draftFields,
  });
}

export async function applySummaryDraftEdits(params: {
  workspaceId: string;
  userId: string;
  dealId: string;
  fields: SummaryDraftFieldInput[];
}): Promise<{ updated: number }> {
  const deal = await loadDealForWorkspace(params.workspaceId, params.dealId);

  await prisma.$transaction(async (tx) => {
    for (const field of params.fields) {
      if (field.dealModuleId && field.templateFieldId) {
        const moduleValue = await tx.dealModuleValue.findFirst({
          where: {
            dealModuleId: field.dealModuleId,
            templateFieldId: field.templateFieldId,
          },
          include: { dealModule: true },
        });

        if (!moduleValue) {
          continue;
        }

        await tx.dealModuleValue.update({
          where: { id: moduleValue.id },
          data: {
            valueJson: toNullableJson(field.value),
            dirty: true,
          },
        });

        await tx.dealModule.update({
          where: { id: field.dealModuleId },
          data: {
            lastUpdatedAt: new Date(),
            lastUpdatedBy: params.userId,
          },
        });

        continue;
      }

      await tx.dealDraftField.upsert({
        where: {
          dealId_fieldKey: {
            dealId: deal.id,
            fieldKey: field.fieldKey,
          },
        },
        create: {
          dealId: deal.id,
          fieldKey: field.fieldKey,
          draftValueJson: toNullableJson(field.value),
          baseCrmValueJson: toNullableJson(field.baseValue),
          dirty: true,
          updatedBy: params.userId,
        },
        update: {
          draftValueJson: toNullableJson(field.value),
          baseCrmValueJson: toNullableJson(field.baseValue),
          dirty: true,
          updatedBy: params.userId,
          updatedAt: new Date(),
        },
      });
    }

    await tx.deal.update({
      where: { id: deal.id },
      data: {
        lastBlueprintUpdatedAt: new Date(),
      },
    });
  });

  await trackAudit({
    workspaceId: params.workspaceId,
    actorUserId: params.userId,
    eventType: "deal.summary_edit",
    entityType: "deal",
    entityId: params.dealId,
    payload: { fieldCount: params.fields.length },
  });

  return { updated: params.fields.length };
}

export async function createDealUpdate(params: {
  workspaceId: string;
  userId: string;
  dealId: string;
  type: "WEEKLY" | "MEETING" | "HANDOFF";
  title: string;
  bodyMarkdown: string;
  risks: string[];
  blockers: string[];
  nextStepOverride?: string | null;
  escalationText?: string | null;
}) {
  const deal = await loadDealForWorkspace(params.workspaceId, params.dealId);

  const update = await prisma.$transaction(async (tx) => {
    const created = await tx.dealUpdate.create({
      data: {
        dealId: deal.id,
        type: params.type,
        title: params.title,
        bodyMarkdown: params.bodyMarkdown,
        risksJson: params.risks,
        blockersJson: params.blockers,
        nextStepOverride: params.nextStepOverride,
        escalationText: params.escalationText,
        createdBy: params.userId,
      },
    });

    const staleDays = (await tx.workspace.findUnique({ where: { id: params.workspaceId }, select: { staleDays: true } }))?.staleDays ?? 7;

    const health = deriveHealth({
      now: new Date(),
      closeDate: deal.closeDate,
      lastActivityAt: deal.lastActivityAt,
      nextStep: params.nextStepOverride ?? deal.nextStep,
      stageMovedCount30d: deal.stageMovedCount30d,
      missingRequiredFields: 0,
    }) as DealHealth;

    await tx.deal.update({
      where: { id: deal.id },
      data: {
        nextStep: params.nextStepOverride ?? deal.nextStep,
        stale: false,
        health,
        lastBlueprintUpdatedAt: new Date(),
      },
    });

    if (params.escalationText) {
      const managers = await tx.membership.findMany({
        where: {
          workspaceId: params.workspaceId,
          active: true,
          role: "MANAGER",
        },
      });

      await tx.notification.createMany({
        data: managers.map((manager) => ({
          workspaceId: params.workspaceId,
          userId: manager.userId,
          dealId: deal.id,
          type: "deal_escalation",
          severity: "CRITICAL",
          title: `${deal.accountName} needs escalation`,
          body: params.escalationText ?? "Escalation requested",
          status: "UNREAD",
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditEvent.create({
      data: {
        workspaceId: params.workspaceId,
        actorUserId: params.userId,
        eventType: "deal.update_created",
        entityType: "deal_update",
        entityId: created.id,
        payloadJson: {
          dealId: deal.id,
          staleDays,
        },
      },
    });

    return created;
  });

  await trackMetric({
    workspaceId: params.workspaceId,
    userId: params.userId,
    eventName: "deal_update_created",
    payload: {
      dealId: deal.id,
      updateType: params.type,
    },
  });

  return toDealUpdateDTO(update);
}

export async function buildSyncPreview(workspaceId: string, dealId: string): Promise<SyncPreviewDTO> {
  const deal = await loadDealForWorkspace(workspaceId, dealId);

  const [draftFields, moduleValues, conflicts, latestUpdate] = await Promise.all([
    prisma.dealDraftField.findMany({
      where: {
        dealId: deal.id,
        dirty: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.dealModuleValue.findMany({
      where: {
        dirty: true,
        dealModule: {
          dealId: deal.id,
        },
        templateField: {
          crmPropertyNameNullable: {
            not: null,
          },
        },
      },
      include: {
        templateField: true,
      },
    }),
    prisma.dealConflict.findMany({
      where: {
        dealId: deal.id,
        resolvedAt: null,
      },
    }),
    prisma.dealUpdate.findFirst({
      where: { dealId: deal.id },
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const fieldsToUpdate = [
    ...draftFields.map((draft) => ({
      fieldKey: draft.fieldKey,
      currentCrmValue: draft.baseCrmValueJson,
      localDraftValue: draft.draftValueJson,
    })),
    ...moduleValues.map((moduleValue) => ({
      fieldKey: `module.${moduleValue.templateField.key}`,
      currentCrmValue: null,
      localDraftValue: moduleValue.valueJson,
    })),
  ];

  const notePreview = createSyncNoteBody({
    dealName: deal.accountName,
    latestUpdate:
      latestUpdate === null
        ? null
        : {
            title: latestUpdate.title,
            bodyMarkdown: latestUpdate.bodyMarkdown,
            createdAt: latestUpdate.createdAt,
            creatorName: latestUpdate.creator.name,
          },
    fields: fieldsToUpdate.map((field) => ({
      fieldKey: field.fieldKey,
      value: field.localDraftValue,
    })),
  });

  return {
    dealId: deal.id,
    fieldsToUpdate,
    notePreview,
    tasksToCreate: 0,
    conflicts: conflicts.map(toConflictDTO),
    pullContext: {
      slackThreads: 0,
      gmailThreads: 0,
      gongSummaries: 0,
      driveDocsUpdated: 0,
    },
  };
}

export async function requestRefresh(params: {
  workspaceId: string;
  dealId: string;
  actorUserId?: string;
}): Promise<{ queued: true }> {
  await loadDealForWorkspace(params.workspaceId, params.dealId);

  await enqueueRefreshDeal({
    workspaceId: params.workspaceId,
    dealId: params.dealId,
    actorUserId: params.actorUserId,
  });

  return { queued: true };
}

export async function requestSync(params: {
  workspaceId: string;
  dealId: string;
  actorUserId: string;
  includeContextRefresh: boolean;
}): Promise<SyncExecutionResultDTO> {
  await loadDealForWorkspace(params.workspaceId, params.dealId);

  const unresolvedConflicts = await prisma.dealConflict.count({
    where: {
      dealId: params.dealId,
      resolvedAt: null,
    },
  });

  if (unresolvedConflicts > 0) {
    return {
      dealId: params.dealId,
      syncJobId: "",
      status: "CONFLICT",
      message: "Resolve conflicts before syncing this deal.",
    };
  }

  const syncJob = await prisma.syncJob.create({
    data: {
      workspaceId: params.workspaceId,
      trigger: SyncTrigger.MANUAL,
      status: SyncStatus.QUEUED,
      requestedBy: params.actorUserId,
      items: {
        create: {
          dealId: params.dealId,
          status: SyncItemStatus.PENDING,
        },
      },
    },
  });

  await enqueueSyncDeal({
    workspaceId: params.workspaceId,
    dealId: params.dealId,
    syncJobId: syncJob.id,
    actorUserId: params.actorUserId,
    includeContextRefresh: params.includeContextRefresh,
  });

  await trackAudit({
    workspaceId: params.workspaceId,
    actorUserId: params.actorUserId,
    eventType: "deal.sync_requested",
    entityType: "deal",
    entityId: params.dealId,
    payload: {
      syncJobId: syncJob.id,
      includeContextRefresh: params.includeContextRefresh,
    },
  });

  return {
    dealId: params.dealId,
    syncJobId: syncJob.id,
    status: "QUEUED",
    message: "Sync job queued.",
  };
}

export async function processRefreshJob(params: {
  workspaceId: string;
  dealId: string;
  actorUserId?: string;
}): Promise<void> {
  const deal = await loadDealForWorkspace(params.workspaceId, params.dealId);
  const token = await getHubSpotToken(params.workspaceId);
  const remoteDeal = await getDealById(token, deal.crmDealId);

  const crmNextStep = remoteDeal.properties.next_step ?? null;
  const crmStage = remoteDeal.properties.dealstage ?? deal.stage;
  const crmCloseDate = remoteDeal.properties.closedate
    ? new Date(Number(remoteDeal.properties.closedate)).toISOString()
    : null;
  const crmAmount = remoteDeal.properties.amount ? new Prisma.Decimal(remoteDeal.properties.amount) : deal.amount;

  const dirtyDrafts = await prisma.dealDraftField.findMany({
    where: {
      dealId: deal.id,
      dirty: true,
      fieldKey: {
        in: Array.from(TOP_LEVEL_SYNC_FIELDS),
      },
    },
  });

  for (const draft of dirtyDrafts) {
    const crmCurrent =
      draft.fieldKey === "nextStep"
        ? crmNextStep
        : draft.fieldKey === "stage"
          ? crmStage
          : draft.fieldKey === "closeDate"
            ? crmCloseDate
            : null;

    if (JSON.stringify(draft.baseCrmValueJson) !== JSON.stringify(crmCurrent)) {
      await prisma.dealConflict.create({
        data: {
          dealId: deal.id,
          fieldKey: draft.fieldKey,
          crmValueJson: toNullableJson(crmCurrent),
          localDraftValueJson: toNullableJson(draft.draftValueJson),
          baseValueJson: toNullableJson(draft.baseCrmValueJson),
        },
      });
    }
  }

  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      nextStep: crmNextStep,
      stage: crmStage,
      closeDate: crmCloseDate ? new Date(crmCloseDate) : null,
      amount: crmAmount,
      lastCrmModifiedAt: remoteDeal.properties.hs_lastmodifieddate
        ? new Date(remoteDeal.properties.hs_lastmodifieddate)
        : new Date(),
      lastActivityAt: remoteDeal.properties.hs_lastactivitydate
        ? new Date(remoteDeal.properties.hs_lastactivitydate)
        : deal.lastActivityAt,
    },
  });

  await trackAudit({
    workspaceId: params.workspaceId,
    actorUserId: params.actorUserId,
    eventType: "deal.refresh_completed",
    entityType: "deal",
    entityId: deal.id,
    payload: {
      crmDealId: deal.crmDealId,
      conflictCount: dirtyDrafts.length,
    },
  });
}

async function getSyncPatchPayload(dealId: string) {
  const draftFields = await prisma.dealDraftField.findMany({
    where: {
      dealId,
      dirty: true,
    },
  });

  const moduleValues = await prisma.dealModuleValue.findMany({
    where: {
      dirty: true,
      dealModule: {
        dealId,
      },
      templateField: {
        crmPropertyNameNullable: {
          not: null,
        },
      },
    },
    include: {
      templateField: true,
    },
  });

  const dealPropertyPatch: Record<string, string | null> = {};
  const changedFieldItems: Array<{ fieldKey: string; value: unknown }> = [];

  for (const draft of draftFields) {
    if (!TOP_LEVEL_SYNC_FIELDS.has(draft.fieldKey)) {
      continue;
    }

    if (draft.fieldKey === "nextStep") {
      dealPropertyPatch.next_step = normalizeTopLevelCrmProperty(draft.fieldKey, draft.draftValueJson);
    }

    if (draft.fieldKey === "nextStepDueDate") {
      dealPropertyPatch.next_step_due_date = normalizeTopLevelCrmProperty(draft.fieldKey, draft.draftValueJson);
    }

    if (draft.fieldKey === "closeDate") {
      dealPropertyPatch.closedate = normalizeTopLevelCrmProperty(draft.fieldKey, draft.draftValueJson);
    }

    if (draft.fieldKey === "stage") {
      dealPropertyPatch.dealstage = normalizeTopLevelCrmProperty(draft.fieldKey, draft.draftValueJson);
    }

    changedFieldItems.push({
      fieldKey: draft.fieldKey,
      value: draft.draftValueJson,
    });
  }

  for (const moduleValue of moduleValues) {
    const propertyName = moduleValue.templateField.crmPropertyNameNullable;
    if (!propertyName) {
      continue;
    }

    dealPropertyPatch[propertyName] = serializeValue(moduleValue.valueJson);
    changedFieldItems.push({
      fieldKey: moduleValue.templateField.key,
      value: moduleValue.valueJson,
    });
  }

  return {
    draftFields,
    moduleValues,
    patch: dealPropertyPatch,
    changedFieldItems,
  };
}

export async function processSyncJob(params: {
  workspaceId: string;
  dealId: string;
  syncJobId: string;
  actorUserId?: string;
  includeContextRefresh: boolean;
}): Promise<void> {
  const deal = await loadDealForWorkspace(params.workspaceId, params.dealId);
  const token = await getHubSpotToken(params.workspaceId);

  const unresolvedConflicts = await prisma.dealConflict.count({
    where: {
      dealId: deal.id,
      resolvedAt: null,
    },
  });

  if (unresolvedConflicts > 0) {
    await prisma.$transaction([
      prisma.syncJobItem.updateMany({
        where: {
          syncJobId: params.syncJobId,
          dealId: deal.id,
        },
        data: {
          status: SyncItemStatus.CONFLICT,
          conflictCount: unresolvedConflicts,
          errorDetail: "Unresolved conflicts present",
        },
      }),
      prisma.syncJob.update({
        where: { id: params.syncJobId },
        data: {
          status: SyncStatus.CONFLICT,
          completedAt: new Date(),
          errorSummary: "Unresolved conflicts present",
        },
      }),
    ]);

    return;
  }

  const { draftFields, moduleValues, patch, changedFieldItems } = await getSyncPatchPayload(deal.id);

  const latestUpdate = await prisma.dealUpdate.findFirst({
    where: { dealId: deal.id },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });

  await prisma.syncJob.update({
    where: { id: params.syncJobId },
    data: {
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  try {
    let noteId: string | null = null;

    if (Object.keys(patch).length > 0) {
      const fieldPatchIdempotencyKey = createWriteIdempotencyKey({
        dealId: deal.id,
        payload: { type: "field_patch", patch },
      });

      const previousPatch = await prisma.crmWriteLog.findUnique({
        where: { idempotencyKey: fieldPatchIdempotencyKey },
      });

      if (!previousPatch || previousPatch.status !== SyncStatus.SUCCESS) {
        await updateDealProperties(token, deal.crmDealId, patch);

        await prisma.crmWriteLog.upsert({
          where: { idempotencyKey: fieldPatchIdempotencyKey },
          create: {
            workspaceId: params.workspaceId,
            dealId: deal.id,
            writeType: "FIELD_PATCH",
            idempotencyKey: fieldPatchIdempotencyKey,
            status: SyncStatus.SUCCESS,
            payloadJson: patch,
          },
          update: {
            status: SyncStatus.SUCCESS,
            payloadJson: patch,
          },
        });
      }
    }

    const notePayload = createSyncNoteBody({
      dealName: deal.accountName,
      latestUpdate:
        latestUpdate === null
          ? null
          : {
              title: latestUpdate.title,
              bodyMarkdown: latestUpdate.bodyMarkdown,
              createdAt: latestUpdate.createdAt,
              creatorName: latestUpdate.creator.name,
            },
      fields: changedFieldItems,
    });

    const noteIdempotencyKey = createWriteIdempotencyKey({
      dealId: deal.id,
      payload: { type: "note_create", notePayload },
    });

    const previousNote = await prisma.crmWriteLog.findUnique({
      where: { idempotencyKey: noteIdempotencyKey },
    });

    if (!previousNote || previousNote.status !== SyncStatus.SUCCESS) {
      const note = await createDealNote(token, {
        crmDealId: deal.crmDealId,
        body: notePayload,
        timestamp: new Date().toISOString(),
      });

      noteId = note.id;

      await prisma.crmWriteLog.upsert({
        where: { idempotencyKey: noteIdempotencyKey },
        create: {
          workspaceId: params.workspaceId,
          dealId: deal.id,
          writeType: "NOTE_CREATE",
          idempotencyKey: noteIdempotencyKey,
          status: SyncStatus.SUCCESS,
          crmObjectIdNullable: note.id,
          payloadJson: { notePayload },
        },
        update: {
          status: SyncStatus.SUCCESS,
          crmObjectIdNullable: note.id,
          payloadJson: { notePayload },
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      const fallbackMembership = await tx.membership.findFirst({
        where: { workspaceId: params.workspaceId, active: true },
        orderBy: { role: "asc" },
      });
      const notificationUserId =
        params.actorUserId ?? deal.ownerUserId ?? fallbackMembership?.userId ?? null;

      await tx.dealDraftField.updateMany({
        where: {
          id: {
            in: draftFields.map((field) => field.id),
          },
        },
        data: {
          dirty: false,
          baseCrmValueJson: Prisma.JsonNull,
        },
      });

      await tx.dealModuleValue.updateMany({
        where: {
          id: {
            in: moduleValues.map((field) => field.id),
          },
        },
        data: {
          dirty: false,
        },
      });

      await tx.deal.update({
        where: { id: deal.id },
        data: {
          lastCrmSyncAt: new Date(),
          lastCrmModifiedAt: new Date(),
        },
      });

      if (latestUpdate) {
        await tx.dealUpdate.update({
          where: { id: latestUpdate.id },
          data: {
            pushedToCrm: true,
            crmNoteId: noteId,
          },
        });
      }

      await tx.syncJobItem.updateMany({
        where: {
          syncJobId: params.syncJobId,
          dealId: deal.id,
        },
        data: {
          status: SyncItemStatus.SUCCESS,
          conflictCount: 0,
          fieldsWrittenCount: changedFieldItems.length,
          noteCreated: true,
        },
      });

      await tx.syncJob.update({
        where: { id: params.syncJobId },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date(),
          errorSummary: null,
        },
      });

      if (notificationUserId) {
        await tx.notification.create({
          data: {
            workspaceId: params.workspaceId,
            userId: notificationUserId,
            dealId: deal.id,
            type: "sync_success",
            severity: "INFO",
            title: "Deal synced successfully",
            body: `${deal.accountName} was synced to HubSpot.`,
            status: "UNREAD",
          },
        });
      }
    });

    await trackMetric({
      workspaceId: params.workspaceId,
      userId: params.actorUserId,
      eventName: "sync_success",
      payload: {
        dealId: deal.id,
      },
    });

    await trackAudit({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      eventType: "deal.sync_completed",
      entityType: "deal",
      entityId: deal.id,
      payload: {
        syncJobId: params.syncJobId,
        changedFieldCount: changedFieldItems.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof HubSpotConnectorError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "unknown_error";

    await prisma.$transaction([
      prisma.syncJobItem.updateMany({
        where: {
          syncJobId: params.syncJobId,
          dealId: deal.id,
        },
        data: {
          status: SyncItemStatus.FAILED,
          errorDetail: message,
        },
      }),
      prisma.syncJob.update({
        where: { id: params.syncJobId },
        data: {
          status: SyncStatus.FAILED,
          errorSummary: message,
          completedAt: new Date(),
        },
      }),
      prisma.auditEvent.create({
        data: {
          workspaceId: params.workspaceId,
          actorUserId: params.actorUserId,
          eventType: "deal.sync_failed",
          entityType: "deal",
          entityId: deal.id,
          payloadJson: {
            error: message,
          },
        },
      }),
    ]);

    throw error;
  }
}

export async function getNeedsAttentionQueues(workspaceId: string): Promise<{
  staleQueue: DealSnapshotDTO[];
  escalationQueue: DealSnapshotDTO[];
}> {
  const [staleDeals, escalationDeals] = await Promise.all([
    prisma.deal.findMany({
      where: {
        workspaceId,
        stale: true,
      },
      include: {
        _count: {
          select: {
            draftFields: {
              where: { dirty: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.deal.findMany({
      where: {
        workspaceId,
        updates: {
          some: {
            escalationText: {
              not: null,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            draftFields: {
              where: { dirty: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    staleQueue: staleDeals.map((deal) =>
      toDealSnapshotDTO({
        ...deal,
        pendingDraftCount: deal._count.draftFields,
      }),
    ),
    escalationQueue: escalationDeals.map((deal) =>
      toDealSnapshotDTO({
        ...deal,
        pendingDraftCount: deal._count.draftFields,
      }),
    ),
  };
}

export async function recomputeHealthAndStaleForWorkspace(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { staleDays: true },
  });

  if (!workspace) {
    return;
  }

  const deals = await prisma.deal.findMany({
    where: { workspaceId },
    include: {
      updates: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  for (const deal of deals) {
    const lastUpdateAt = deal.updates[0]?.createdAt ?? null;
    const stale =
      lastUpdateAt === null
        ? true
        : (Date.now() - lastUpdateAt.getTime()) / (1000 * 60 * 60 * 24) >= workspace.staleDays;

    const health = deriveHealth({
      now: new Date(),
      closeDate: deal.closeDate,
      lastActivityAt: deal.lastActivityAt,
      nextStep: deal.nextStep,
      stageMovedCount30d: deal.stageMovedCount30d,
      missingRequiredFields: 0,
    }) as DealHealth;

    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stale,
        health,
      },
    });
  }
}
