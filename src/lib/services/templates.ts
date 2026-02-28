import { MembershipRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { toTemplateDTO } from "@/lib/services/mappers";
import type { TemplateDTO } from "@/lib/types/contracts";

type TemplateInput = {
  name: string;
  role: MembershipRole;
  active: boolean;
  modules: Array<{
    key: string;
    title: string;
    requiredByDefault: boolean;
    sortOrder: number;
    fields: Array<{
      key: string;
      label: string;
      type: "TEXT" | "SELECT" | "MULTISELECT" | "DATE" | "BOOLEAN";
      options: string[];
      crmPropertyName?: string | null;
      requiredRules?: unknown;
      sortOrder: number;
    }>;
  }>;
  stageRequirements: Array<{ stage: string; requiredFields: string[] }>;
};

function toOptionalJson(
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

export async function listTemplates(workspaceId: string): Promise<TemplateDTO[]> {
  const templates = await prisma.template.findMany({
    where: { workspaceId },
    include: {
      modules: {
        include: {
          fields: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      stageRequirements: {
        orderBy: { stage: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return templates.map((template) => toTemplateDTO(template));
}

export async function createTemplate(workspaceId: string, input: TemplateInput): Promise<TemplateDTO> {
  const template = await prisma.template.create({
    data: {
      workspaceId,
      name: input.name,
      role: input.role,
      active: input.active,
      modules: {
        create: input.modules.map((templateModule) => ({
          key: templateModule.key,
          title: templateModule.title,
          requiredByDefault: templateModule.requiredByDefault,
          sortOrder: templateModule.sortOrder,
          fields: {
            create: templateModule.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              optionsJson: field.options,
              crmPropertyNameNullable: field.crmPropertyName ?? null,
              requiredRulesJson: toOptionalJson(field.requiredRules),
              sortOrder: field.sortOrder,
            })),
          },
        })),
      },
      stageRequirements: {
        create: input.stageRequirements.map((requirement) => ({
          stage: requirement.stage,
          requiredFields: requirement.requiredFields,
        })),
      },
    },
    include: {
      modules: {
        include: {
          fields: true,
        },
      },
      stageRequirements: true,
    },
  });

  return toTemplateDTO(template);
}

export async function updateTemplate(
  workspaceId: string,
  templateId: string,
  input: TemplateInput,
): Promise<TemplateDTO> {
  const existing = await prisma.template.findFirst({
    where: {
      id: templateId,
      workspaceId,
    },
  });

  if (!existing) {
    throw new Error("Template not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: { id: templateId },
      data: {
        name: input.name,
        role: input.role,
        active: input.active,
      },
    });

    await tx.templateModule.deleteMany({ where: { templateId } });
    await tx.stageRequirement.deleteMany({ where: { templateId } });

    for (const templateModule of input.modules) {
      await tx.templateModule.create({
        data: {
          templateId,
          key: templateModule.key,
          title: templateModule.title,
          requiredByDefault: templateModule.requiredByDefault,
          sortOrder: templateModule.sortOrder,
          fields: {
            create: templateModule.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              optionsJson: field.options,
              crmPropertyNameNullable: field.crmPropertyName ?? null,
              requiredRulesJson: toOptionalJson(field.requiredRules),
              sortOrder: field.sortOrder,
            })),
          },
        },
      });
    }

    for (const requirement of input.stageRequirements) {
      await tx.stageRequirement.create({
        data: {
          templateId,
          stage: requirement.stage,
          requiredFields: requirement.requiredFields,
        },
      });
    }
  });

  const template = await prisma.template.findUniqueOrThrow({
    where: { id: templateId },
    include: {
      modules: {
        include: {
          fields: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      stageRequirements: true,
    },
  });

  return toTemplateDTO(template);
}

export async function updateFieldMapping(
  workspaceId: string,
  templateFieldId: string,
  crmPropertyName: string,
): Promise<{ updated: true }> {
  await prisma.templateField.updateMany({
    where: {
      id: templateFieldId,
      module: {
        template: {
          workspaceId,
        },
      },
    },
    data: {
      crmPropertyNameNullable: crmPropertyName,
    },
  });

  return { updated: true };
}
