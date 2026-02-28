export type MembershipRole = "ADMIN" | "MANAGER" | "AE" | "SE" | "SDR";

export type DealHealth = "GREEN" | "YELLOW" | "RED";

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ConflictResolution = "ACCEPT_CRM" | "OVERWRITE_CRM";

export interface ConflictDTO {
  id: string;
  fieldKey: string;
  crmValue: unknown;
  localDraftValue: unknown;
  baseValue: unknown;
  detectedAt: string;
  resolutionRequired: boolean;
}

export interface DealDraftChangeDTO {
  fieldKey: string;
  draftValue: unknown;
  baseValue: unknown;
  dirty: boolean;
  updatedAt: string;
}

export interface ModuleFieldDTO {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "SELECT" | "MULTISELECT" | "DATE" | "BOOLEAN";
  value: unknown;
  dirty: boolean;
  crmPropertyName: string | null;
}

export interface ModuleDTO {
  id: string;
  title: string;
  templateModuleId: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string | null;
  fields: ModuleFieldDTO[];
}

export interface DealUpdateDTO {
  id: string;
  type: "WEEKLY" | "MEETING" | "HANDOFF";
  title: string;
  bodyMarkdown: string;
  risks: string[];
  blockers: string[];
  nextStepOverride: string | null;
  escalationText: string | null;
  pushedToCrm: boolean;
  createdAt: string;
  createdBy: string;
}

export interface DealSnapshotDTO {
  id: string;
  workspaceId: string;
  crmDealId: string;
  accountName: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  amount: number | null;
  closeDate: string | null;
  stage: string;
  ownerId: string | null;
  nextStep: string | null;
  nextStepDueDate: string | null;
  risks: string[];
  blockers: string[];
  competition: string[];
  health: DealHealth;
  stale: boolean;
  lastActivityAt: string | null;
  lastBlueprintUpdatedAt: string;
  lastCrmSyncAt: string | null;
  lastCrmModifiedAt: string | null;
  pendingChanges: number;
}

export interface TimelineItemDTO {
  id: string;
  source: "BLUEPRINT" | "CRM";
  title: string;
  body: string;
  createdAt: string;
}

export interface DealDossierDTO {
  deal: DealSnapshotDTO;
  lens: "AE" | "SE";
  modules: ModuleDTO[];
  updates: DealUpdateDTO[];
  timeline: TimelineItemDTO[];
  conflicts: ConflictDTO[];
  draftFields: DealDraftChangeDTO[];
}

export interface SyncPreviewFieldDTO {
  fieldKey: string;
  currentCrmValue: unknown;
  localDraftValue: unknown;
}

export interface SyncPreviewDTO {
  dealId: string;
  fieldsToUpdate: SyncPreviewFieldDTO[];
  notePreview: string;
  tasksToCreate: number;
  conflicts: ConflictDTO[];
  pullContext: {
    slackThreads: number;
    gmailThreads: number;
    gongSummaries: number;
    driveDocsUpdated: number;
  };
}

export interface SyncExecutionResultDTO {
  dealId: string;
  syncJobId: string;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CONFLICT";
  message: string;
}

export interface DashboardCardDTO {
  key: "totalPipeline" | "pipelineInWindow" | "needsUpdate" | "atRisk";
  label: string;
  value: number;
}

export interface DashboardDTO {
  cards: DashboardCardDTO[];
  deals: DealSnapshotDTO[];
  staleQueue: DealSnapshotDTO[];
  escalationQueue: DealSnapshotDTO[];
}

export interface TemplateFieldDTO {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "SELECT" | "MULTISELECT" | "DATE" | "BOOLEAN";
  options: string[];
  crmPropertyName: string | null;
  requiredRules: unknown;
  sortOrder: number;
}

export interface TemplateModuleDTO {
  id: string;
  key: string;
  title: string;
  requiredByDefault: boolean;
  sortOrder: number;
  fields: TemplateFieldDTO[];
}

export interface TemplateDTO {
  id: string;
  name: string;
  role: MembershipRole;
  active: boolean;
  modules: TemplateModuleDTO[];
  stageRequirements: Array<{
    stage: string;
    requiredFields: string[];
  }>;
}

export interface NotificationDTO {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  dealId: string | null;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
}
