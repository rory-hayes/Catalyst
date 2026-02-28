import type {
  Deal,
  DealConflict,
  DealDraftField,
  DealHealth,
  DealModule,
  DealModuleValue,
  DealUpdate,
  Notification,
  NotificationSeverity,
  NotificationStatus,
  Template,
  TemplateField,
  TemplateModule,
  StageRequirement,
} from "@prisma/client";
import type {
  ConflictDTO,
  DealDraftChangeDTO,
  DealSnapshotDTO,
  DealUpdateDTO,
  ModuleDTO,
  NotificationDTO,
  TemplateDTO,
  TemplateModuleDTO,
} from "@/lib/types/contracts";

export type DealWithPendingCount = Deal & { pendingDraftCount?: number };

export function toDealSnapshotDTO(deal: DealWithPendingCount): DealSnapshotDTO {
  return {
    id: deal.id,
    workspaceId: deal.workspaceId,
    crmDealId: deal.crmDealId,
    accountName: deal.accountName,
    primaryContactName: deal.primaryContactName,
    primaryContactEmail: deal.primaryContactEmail,
    amount: deal.amount ? Number(deal.amount) : null,
    closeDate: deal.closeDate?.toISOString() ?? null,
    stage: deal.stage,
    ownerId: deal.ownerUserId,
    nextStep: deal.nextStep,
    nextStepDueDate: deal.nextStepDueDate?.toISOString() ?? null,
    risks: deal.risks,
    blockers: deal.blockers,
    competition: deal.competition,
    health: deal.health as DealHealth,
    stale: deal.stale,
    lastActivityAt: deal.lastActivityAt?.toISOString() ?? null,
    lastBlueprintUpdatedAt: deal.lastBlueprintUpdatedAt.toISOString(),
    lastCrmSyncAt: deal.lastCrmSyncAt?.toISOString() ?? null,
    lastCrmModifiedAt: deal.lastCrmModifiedAt?.toISOString() ?? null,
    pendingChanges: deal.pendingDraftCount ?? 0,
  };
}

export function toConflictDTO(conflict: DealConflict): ConflictDTO {
  return {
    id: conflict.id,
    fieldKey: conflict.fieldKey,
    crmValue: conflict.crmValueJson,
    localDraftValue: conflict.localDraftValueJson,
    baseValue: conflict.baseValueJson,
    detectedAt: conflict.detectedAt.toISOString(),
    resolutionRequired: conflict.resolvedAt === null,
  };
}

export function toDraftFieldDTO(draft: DealDraftField): DealDraftChangeDTO {
  return {
    fieldKey: draft.fieldKey,
    draftValue: draft.draftValueJson,
    baseValue: draft.baseCrmValueJson,
    dirty: draft.dirty,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export function toDealUpdateDTO(update: DealUpdate): DealUpdateDTO {
  return {
    id: update.id,
    type: update.type,
    title: update.title,
    bodyMarkdown: update.bodyMarkdown,
    risks: (update.risksJson as string[] | null) ?? [],
    blockers: (update.blockersJson as string[] | null) ?? [],
    nextStepOverride: update.nextStepOverride,
    escalationText: update.escalationText,
    pushedToCrm: update.pushedToCrm,
    createdAt: update.createdAt.toISOString(),
    createdBy: update.createdBy,
  };
}

export function toModuleDTO(
  module: DealModule & {
    values: Array<DealModuleValue & { templateField: TemplateField }>;
  },
): ModuleDTO {
  return {
    id: module.id,
    title: module.title,
    templateModuleId: module.templateModuleId,
    lastUpdatedAt: module.lastUpdatedAt.toISOString(),
    lastUpdatedBy: module.lastUpdatedBy,
    fields: module.values.map((value) => ({
      id: value.id,
      key: value.templateField.key,
      label: value.templateField.label,
      type: value.templateField.type,
      value: value.valueJson,
      dirty: value.dirty,
      crmPropertyName: value.templateField.crmPropertyNameNullable,
    })),
  };
}

export function toTemplateDTO(
  template: Template & {
    modules: Array<TemplateModule & { fields: TemplateField[] }>;
    stageRequirements: StageRequirement[];
  },
): TemplateDTO {
  const modules: TemplateModuleDTO[] = template.modules.map((module) => ({
    id: module.id,
    key: module.key,
    title: module.title,
    requiredByDefault: module.requiredByDefault,
    sortOrder: module.sortOrder,
    fields: module.fields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      options: (field.optionsJson as string[] | null) ?? [],
      crmPropertyName: field.crmPropertyNameNullable,
      requiredRules: field.requiredRulesJson,
      sortOrder: field.sortOrder,
    })),
  }));

  return {
    id: template.id,
    name: template.name,
    role: template.role,
    active: template.active,
    modules,
    stageRequirements: template.stageRequirements.map((requirement) => ({
      stage: requirement.stage,
      requiredFields: (requirement.requiredFields as string[] | null) ?? [],
    })),
  };
}

export function toNotificationDTO(notification: Notification): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    severity: notification.severity as NotificationSeverity,
    title: notification.title,
    body: notification.body,
    dealId: notification.dealId,
    status: notification.status as NotificationStatus,
    createdAt: notification.createdAt.toISOString(),
  };
}
