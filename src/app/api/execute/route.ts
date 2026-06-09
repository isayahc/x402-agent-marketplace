import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { executeCapability } from "@/lib/marketplace/executor";
import { verifyExecutionToken } from "@/lib/marketplace/quotes";
import type { ExecuteRequest } from "@/lib/marketplace/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ExecuteRequest | null;

  if (!isRecord(body) || typeof body.execution_token !== "string") {
    return jsonResponse(
      {
        error: "invalid_execute_request",
        message: "POST JSON with execution_token and arguments is required.",
      },
      { status: 400 },
    );
  }

  try {
    const token = verifyExecutionToken(body.execution_token);

    if (body.quote_id && body.quote_id !== token.quote_id) {
      return jsonResponse(
        {
          error: "quote_mismatch",
          message: "quote_id does not match the execution token.",
        },
        { status: 400 },
      );
    }

    return jsonResponse(
      executeCapability({
        token,
        args: isRecord(body.arguments) ? body.arguments : {},
      }),
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "execution_failed",
        message: error instanceof Error ? error.message : "Execution failed.",
      },
      { status: 400 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
