import { describe, expect, it } from "vitest";

import { gridEditSchema, templateSchema } from "../../lib/validation/schemas";

describe("API contracts", () => {
  it("accepts valid grid edits", () => {
    const parsed = gridEditSchema.parse({
      nextStep: "Finalize mutual action plan",
      closeDate: "2026-04-14T00:00:00.000Z",
    });

    expect(parsed.nextStep).toBe("Finalize mutual action plan");
  });

  it("accepts role template payload", () => {
    const payload = templateSchema.parse({
      name: "AE - MEDDICC Lite",
      role: "AE",
      active: true,
      modules: [
        {
          key: "stakeholders",
          title: "Stakeholders",
          requiredByDefault: true,
          sortOrder: 0,
          fields: [
            {
              key: "champion",
              label: "Champion",
              type: "TEXT",
              options: [],
              crmPropertyName: null,
              sortOrder: 0,
            },
          ],
        },
      ],
      stageRequirements: [{ stage: "Negotiation", requiredFields: ["champion"] }],
    });

    expect(payload.modules[0]?.fields[0]?.key).toBe("champion");
  });
});
