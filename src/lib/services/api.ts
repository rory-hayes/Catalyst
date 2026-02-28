import { NextResponse } from "next/server";
import { AuthError, SetupError } from "@/lib/auth/session";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function withRouteErrorHandling<T>(handler: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await handler();
    return jsonOk(data);
  } catch (error) {
    if (error instanceof SetupError) {
      return jsonError(error.message, 503);
    }

    if (error instanceof AuthError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof Error && error.name === "PrismaClientInitializationError") {
      return jsonError(`Database initialization failed: ${error.message}`, 503);
    }

    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }

    return jsonError("Unexpected server error", 500);
  }
}
