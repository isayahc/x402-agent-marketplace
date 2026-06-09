import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { routePaidA2AMessage } from "@/lib/marketplace/a2a";
import type { PaidA2ASendMessageRequest } from "@/lib/marketplace/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | PaidA2ASendMessageRequest
    | null;

  if (!isRecord(body)) {
    return jsonResponse(
      {
        error: "invalid_a2a_request",
        message:
          "POST JSON with execution_token and A2A message is required.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await routePaidA2AMessage(body);

    return jsonResponse({
      kind: "a2a_routed_task",
      interface_run_id: response.run.id,
      task: response.task,
      run: response.run,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "a2a_routing_failed",
        message:
          error instanceof Error ? error.message : "Unable to route A2A task.",
      },
      { status: 400 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
