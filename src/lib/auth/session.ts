import type { NextRequest } from "next/server";
import { MembershipRole, Prisma } from "@prisma/client";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export interface UserContext {
  userId: string;
  email: string;
  workspaceId: string;
  role: MembershipRole;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

export async function getUserContext(request?: NextRequest): Promise<UserContext> {
  const emailFromHeader = request?.headers.get("x-user-email")?.toLowerCase();
  const userIdFromHeader = request?.headers.get("x-user-id");
  const orFilters: Prisma.UserWhereInput[] = [];

  if (userIdFromHeader) {
    orFilters.push({ id: userIdFromHeader });
  }

  orFilters.push({ email: emailFromHeader ?? env.DEV_USER_EMAIL });

  let user;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: orFilters,
      },
      include: {
        memberships: {
          where: { active: true },
          orderBy: { role: "asc" },
        },
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new SetupError(
        `Database unavailable. Configure DATABASE_URL and apply migrations. Details: ${error.message}`,
      );
    }
    throw new SetupError("Database unavailable. Configure DATABASE_URL.");
  }

  if (!user) {
    throw new AuthError("No authenticated user found. Seed the database first.");
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new AuthError("User has no active workspace membership.");
  }

  return {
    userId: user.id,
    email: user.email,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}

export function requireRole(ctx: UserContext, allowed: MembershipRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new AuthError(`Role ${ctx.role} is not authorized for this action.`);
  }
}
