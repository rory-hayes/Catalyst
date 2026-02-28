import { CrmProvider, DealHealth, MembershipRole, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: "ws_demo" },
    update: {
      name: "Blueprint Demo Workspace",
      timezone: "America/Los_Angeles",
      eodSyncEnabled: true,
      eodSyncTimeLocal: "19:00",
      staleDays: 7,
    },
    create: {
      id: "ws_demo",
      name: "Blueprint Demo Workspace",
      timezone: "America/Los_Angeles",
      eodSyncEnabled: true,
      eodSyncTimeLocal: "19:00",
      staleDays: 7,
    },
  });

  const users = [
    { id: "user_admin", email: "admin@blueprint.dev", name: "Riley Admin", role: MembershipRole.ADMIN },
    { id: "user_manager", email: "manager@blueprint.dev", name: "Sam Manager", role: MembershipRole.MANAGER },
    { id: "user_ae", email: "ae@blueprint.dev", name: "Erica AE", role: MembershipRole.AE },
    { id: "user_se", email: "se@blueprint.dev", name: "Terry SE", role: MembershipRole.SE },
  ];
  const userByRole: Record<"admin" | "manager" | "ae" | "se", string> = {
    admin: "",
    manager: "",
    ae: "",
    se: "",
  };

  for (const user of users) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: "supabase",
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: upsertedUser.id,
          workspaceId: workspace.id,
        },
      },
      update: {
        role: user.role,
        active: true,
      },
      create: {
        userId: upsertedUser.id,
        workspaceId: workspace.id,
        role: user.role,
        active: true,
      },
    });

    if (user.role === MembershipRole.ADMIN) {
      userByRole.admin = upsertedUser.id;
    }
    if (user.role === MembershipRole.MANAGER) {
      userByRole.manager = upsertedUser.id;
    }
    if (user.role === MembershipRole.AE) {
      userByRole.ae = upsertedUser.id;
    }
    if (user.role === MembershipRole.SE) {
      userByRole.se = upsertedUser.id;
    }
  }

  await prisma.crmConnection.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: CrmProvider.HUBSPOT,
      },
    },
    update: {
      status: "CONNECTED",
      encryptedAccessToken: process.env.HUBSPOT_TEST_TOKEN ?? "demo_hubspot_access_token",
      encryptedRefreshToken: "demo_refresh_token",
      scopes: [
        "crm.objects.deals.read",
        "crm.objects.deals.write",
        "crm.objects.contacts.read",
        "crm.objects.companies.read",
        "crm.objects.notes.write",
      ],
    },
    create: {
      workspaceId: workspace.id,
      provider: CrmProvider.HUBSPOT,
      status: "CONNECTED",
      encryptedAccessToken: process.env.HUBSPOT_TEST_TOKEN ?? "demo_hubspot_access_token",
      encryptedRefreshToken: "demo_refresh_token",
      scopes: [
        "crm.objects.deals.read",
        "crm.objects.deals.write",
        "crm.objects.contacts.read",
        "crm.objects.companies.read",
        "crm.objects.notes.write",
      ],
    },
  });

  const seededDeals = [
    {
      id: "deal_1",
      crmDealId: "1001",
      accountName: "Northwind Health",
      primaryContactName: "Dana Wells",
      primaryContactEmail: "dana@northwindhealth.com",
      amount: 150000,
      closeDate: addDays(24),
      stage: "Negotiation",
      ownerUserId: userByRole.ae,
      nextStep: "Finalize legal redlines",
      nextStepDueDate: addDays(4),
      risks: ["Security review backlog"],
      blockers: ["Legal review turnaround"],
      competition: ["Competitor X"],
      health: DealHealth.YELLOW,
      stale: false,
      stageMovedCount30d: 1,
    },
    {
      id: "deal_2",
      crmDealId: "1002",
      accountName: "Evergreen Logistics",
      primaryContactName: "Chris Kim",
      primaryContactEmail: "ckim@evergreenlogistics.com",
      amount: 94000,
      closeDate: addDays(10),
      stage: "Proposal",
      ownerUserId: userByRole.ae,
      nextStep: "Schedule commercial review",
      nextStepDueDate: addDays(2),
      risks: ["Budget approval pending"],
      blockers: [],
      competition: ["Competitor Y"],
      health: DealHealth.YELLOW,
      stale: false,
      stageMovedCount30d: 2,
    },
    {
      id: "deal_3",
      crmDealId: "1003",
      accountName: "Canyon Manufacturing",
      primaryContactName: "Taylor Park",
      primaryContactEmail: "tpark@canyonmfg.com",
      amount: 50000,
      closeDate: addDays(-2),
      stage: "Verbal Commit",
      ownerUserId: userByRole.ae,
      nextStep: null,
      nextStepDueDate: null,
      risks: ["No executive sponsor"],
      blockers: ["No next step committed"],
      competition: [],
      health: DealHealth.RED,
      stale: true,
      stageMovedCount30d: 2,
    },
    {
      id: "deal_4",
      crmDealId: "1004",
      accountName: "Arbor Financial",
      primaryContactName: "Morgan Lee",
      primaryContactEmail: "morgan@arborfinancial.com",
      amount: 220000,
      closeDate: addDays(45),
      stage: "Evaluation",
      ownerUserId: userByRole.ae,
      nextStep: "Deliver technical architecture review",
      nextStepDueDate: addDays(6),
      risks: [],
      blockers: [],
      competition: ["Competitor Z"],
      health: DealHealth.GREEN,
      stale: false,
      stageMovedCount30d: 0,
    },
  ];

  for (const deal of seededDeals) {
    await prisma.deal.upsert({
      where: {
        workspaceId_crmDealId: {
          workspaceId: workspace.id,
          crmDealId: deal.crmDealId,
        },
      },
      update: {
        accountName: deal.accountName,
        primaryContactName: deal.primaryContactName,
        primaryContactEmail: deal.primaryContactEmail,
        amount: deal.amount,
        closeDate: deal.closeDate,
        stage: deal.stage,
        ownerUserId: deal.ownerUserId,
        nextStep: deal.nextStep,
        nextStepDueDate: deal.nextStepDueDate,
        risks: deal.risks,
        blockers: deal.blockers,
        competition: deal.competition,
        health: deal.health,
        stale: deal.stale,
        stageMovedCount30d: deal.stageMovedCount30d,
        lastActivityAt: addDays(-2),
      },
      create: {
        id: deal.id,
        workspaceId: workspace.id,
        crmDealId: deal.crmDealId,
        accountName: deal.accountName,
        primaryContactName: deal.primaryContactName,
        primaryContactEmail: deal.primaryContactEmail,
        amount: deal.amount,
        closeDate: deal.closeDate,
        stage: deal.stage,
        ownerUserId: deal.ownerUserId,
        nextStep: deal.nextStep,
        nextStepDueDate: deal.nextStepDueDate,
        risks: deal.risks,
        blockers: deal.blockers,
        competition: deal.competition,
        health: deal.health,
        stale: deal.stale,
        stageMovedCount30d: deal.stageMovedCount30d,
        lastActivityAt: addDays(-2),
      },
    });
  }

  const aeTemplate = await prisma.template.upsert({
    where: { id: "tpl_ae" },
    update: {
      name: "AE - MEDDICC Lite",
      role: MembershipRole.AE,
      active: true,
    },
    create: {
      id: "tpl_ae",
      workspaceId: workspace.id,
      name: "AE - MEDDICC Lite",
      role: MembershipRole.AE,
      active: true,
    },
  });

  const seTemplate = await prisma.template.upsert({
    where: { id: "tpl_se" },
    update: {
      name: "SE - Technical Plan",
      role: MembershipRole.SE,
      active: true,
    },
    create: {
      id: "tpl_se",
      workspaceId: workspace.id,
      name: "SE - Technical Plan",
      role: MembershipRole.SE,
      active: true,
    },
  });

  await prisma.templateModule.deleteMany({
    where: {
      templateId: {
        in: [aeTemplate.id, seTemplate.id],
      },
    },
  });
  await prisma.stageRequirement.deleteMany({
    where: {
      templateId: {
        in: [aeTemplate.id, seTemplate.id],
      },
    },
  });

  const aeStakeholdersModule = await prisma.templateModule.create({
    data: {
      templateId: aeTemplate.id,
      key: "stakeholders",
      title: "Stakeholders",
      requiredByDefault: true,
      sortOrder: 0,
      fields: {
        create: [
          {
            key: "champion",
            label: "Champion",
            type: "TEXT",
            crmPropertyNameNullable: null,
            sortOrder: 0,
          },
          {
            key: "competition",
            label: "Competition",
            type: "TEXT",
            crmPropertyNameNullable: "competition",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { fields: true },
  });

  const aeRisksModule = await prisma.templateModule.create({
    data: {
      templateId: aeTemplate.id,
      key: "risks",
      title: "Blockers & Risks",
      requiredByDefault: true,
      sortOrder: 1,
      fields: {
        create: [
          {
            key: "risks_summary",
            label: "Risks Summary",
            type: "TEXT",
            crmPropertyNameNullable: "risks_summary",
            sortOrder: 0,
          },
        ],
      },
    },
    include: { fields: true },
  });

  const seTechnicalModule = await prisma.templateModule.create({
    data: {
      templateId: seTemplate.id,
      key: "technical_plan",
      title: "Technical Plan",
      requiredByDefault: true,
      sortOrder: 0,
      fields: {
        create: [
          {
            key: "technical_scope",
            label: "Technical Scope",
            type: "TEXT",
            crmPropertyNameNullable: "technical_scope",
            sortOrder: 0,
          },
          {
            key: "security_status",
            label: "Security Status",
            type: "TEXT",
            crmPropertyNameNullable: "security_status",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { fields: true },
  });

  await prisma.stageRequirement.createMany({
    data: [
      {
        templateId: aeTemplate.id,
        stage: "Negotiation",
        requiredFields: ["champion", "risks_summary"],
      },
      {
        templateId: seTemplate.id,
        stage: "Evaluation",
        requiredFields: ["technical_scope", "security_status"],
      },
    ],
  });

  const deals = await prisma.deal.findMany({
    where: { workspaceId: workspace.id },
  });

  for (const deal of deals) {
    const aeModuleInstances = [aeStakeholdersModule, aeRisksModule];
    for (const templateModule of aeModuleInstances) {
      const dealModule = await prisma.dealModule.upsert({
        where: {
          dealId_templateModuleId: {
            dealId: deal.id,
            templateModuleId: templateModule.id,
          },
        },
        update: {
          title: templateModule.title,
          lastUpdatedBy: userByRole.ae,
        },
        create: {
          dealId: deal.id,
          templateModuleId: templateModule.id,
          title: templateModule.title,
          lastUpdatedBy: userByRole.ae,
        },
      });

      for (const field of templateModule.fields) {
        await prisma.dealModuleValue.upsert({
          where: {
            dealModuleId_templateFieldId: {
              dealModuleId: dealModule.id,
              templateFieldId: field.id,
            },
          },
          update: {
            valueJson: field.key === "champion" ? "Primary champion identified" : "",
            dirty: false,
          },
          create: {
            dealModuleId: dealModule.id,
            templateFieldId: field.id,
            valueJson: field.key === "champion" ? "Primary champion identified" : "",
            dirty: false,
          },
        });
      }
    }

    if (deal.id === "deal_4") {
      const seDealModule = await prisma.dealModule.upsert({
        where: {
          dealId_templateModuleId: {
            dealId: deal.id,
            templateModuleId: seTechnicalModule.id,
          },
        },
        update: {
          title: seTechnicalModule.title,
          lastUpdatedBy: userByRole.se,
        },
        create: {
          dealId: deal.id,
          templateModuleId: seTechnicalModule.id,
          title: seTechnicalModule.title,
          lastUpdatedBy: userByRole.se,
        },
      });

      for (const field of seTechnicalModule.fields) {
        await prisma.dealModuleValue.upsert({
          where: {
            dealModuleId_templateFieldId: {
              dealModuleId: seDealModule.id,
              templateFieldId: field.id,
            },
          },
          update: {
            valueJson: field.key === "technical_scope" ? "SAML + REST integration" : "Security review in progress",
            dirty: false,
          },
          create: {
            dealModuleId: seDealModule.id,
            templateFieldId: field.id,
            valueJson: field.key === "technical_scope" ? "SAML + REST integration" : "Security review in progress",
            dirty: false,
          },
        });
      }
    }
  }

  await prisma.dealUpdate.upsert({
    where: { id: "update_1" },
    update: {
      title: "Weekly checkpoint",
      bodyMarkdown: "Meeting held with legal and procurement. Redlines expected Friday.",
      risksJson: ["Legal turnaround"],
      blockersJson: ["Security response pending"],
      nextStepOverride: "Send legal redline package",
      pushedToCrm: false,
    },
    create: {
      id: "update_1",
      dealId: "deal_1",
      type: "WEEKLY",
      title: "Weekly checkpoint",
      bodyMarkdown: "Meeting held with legal and procurement. Redlines expected Friday.",
      risksJson: ["Legal turnaround"],
      blockersJson: ["Security response pending"],
      nextStepOverride: "Send legal redline package",
      createdBy: userByRole.ae,
      pushedToCrm: false,
    },
  });

  await prisma.dealUpdate.upsert({
    where: { id: "update_2" },
    update: {
      title: "Technical discovery",
      bodyMarkdown: "Validated auth and data residency requirements.",
      risksJson: [],
      blockersJson: [],
      nextStepOverride: "Share architecture doc",
      pushedToCrm: false,
    },
    create: {
      id: "update_2",
      dealId: "deal_4",
      type: "MEETING",
      title: "Technical discovery",
      bodyMarkdown: "Validated auth and data residency requirements.",
      risksJson: [],
      blockersJson: [],
      nextStepOverride: "Share architecture doc",
      createdBy: userByRole.se,
      pushedToCrm: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif_1" },
    update: {
      title: "Canyon Manufacturing requires update",
      body: "Close date expired and next step is missing.",
      status: "UNREAD",
    },
    create: {
      id: "notif_1",
      workspaceId: workspace.id,
      userId: userByRole.ae,
      dealId: "deal_3",
      type: "deal_hygiene_reminder",
      severity: "CRITICAL",
      title: "Canyon Manufacturing requires update",
      body: "Close date expired and next step is missing.",
      status: "UNREAD",
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif_2" },
    update: {
      title: "Weekly manager digest",
      body: "1 negotiation deal at risk due to security review blocker.",
      status: "UNREAD",
    },
    create: {
      id: "notif_2",
      workspaceId: workspace.id,
      userId: userByRole.manager,
      dealId: "deal_1",
      type: "manager_digest",
      severity: "INFO",
      title: "Weekly manager digest",
      body: "1 negotiation deal at risk due to security review blocker.",
      status: "UNREAD",
    },
  });

  console.log("Seed complete", {
    workspaceId: workspace.id,
    deals: seededDeals.length,
    users: users.length,
  });
}

function addDays(offset: number): Date {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  return now;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
