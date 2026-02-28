import type { MembershipRole } from "@prisma/client";

export function getDefaultLens(role: MembershipRole): "AE" | "SE" {
  return role === "SE" ? "SE" : "AE";
}
