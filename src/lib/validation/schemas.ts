import { z } from "zod";

export const gridEditSchema = z.object({
  nextStep: z.string().trim().min(1).max(500).optional().nullable(),
  nextStepDueDate: z.string().datetime().optional().nullable(),
  closeDate: z.string().datetime().optional().nullable(),
  stage: z.string().trim().min(1).max(100).optional(),
});

export const summaryPatchSchema = z.object({
  fields: z
    .array(
      z.object({
        fieldKey: z.string().min(1),
        value: z.unknown(),
        baseValue: z.unknown().optional(),
        dealModuleId: z.string().optional(),
        templateFieldId: z.string().optional(),
      }),
    )
    .min(1),
});

export const dealUpdateSchema = z.object({
  type: z.enum(["WEEKLY", "MEETING", "HANDOFF"]),
  title: z.string().trim().min(1).max(160),
  bodyMarkdown: z.string().trim().min(1),
  risks: z.array(z.string().trim().min(1)).default([]),
  blockers: z.array(z.string().trim().min(1)).default([]),
  nextStepOverride: z.string().trim().max(500).nullable().optional(),
  escalationText: z.string().trim().max(500).nullable().optional(),
});

export const templateFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["TEXT", "SELECT", "MULTISELECT", "DATE", "BOOLEAN"]),
  options: z.array(z.string()).default([]),
  crmPropertyName: z.string().nullable().optional(),
  requiredRules: z.unknown().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const templateModuleSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  requiredByDefault: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  fields: z.array(templateFieldSchema).default([]),
});

export const templateSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "AE", "SE", "SDR"]),
  active: z.boolean().default(true),
  modules: z.array(templateModuleSchema).default([]),
  stageRequirements: z
    .array(
      z.object({
        stage: z.string().min(1),
        requiredFields: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
});

export const mappingSchema = z.object({
  templateFieldId: z.string().min(1),
  crmPropertyName: z.string().min(1),
});

export const syncExecuteSchema = z.object({
  includeContextRefresh: z.boolean().default(true),
});
