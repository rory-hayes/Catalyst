import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/config/env";

export async function GET() {
  const status = {
    ok: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: "unknown",
      redisConfigured: Boolean(env.REDIS_URL),
    },
  } as {
    ok: boolean;
    timestamp: string;
    checks: {
      database: "ok" | "error" | "unknown";
      redisConfigured: boolean;
    };
    error?: string;
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.checks.database = "ok";
  } catch (error) {
    status.ok = false;
    status.checks.database = "error";
    status.error = error instanceof Error ? error.message : "database check failed";
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
