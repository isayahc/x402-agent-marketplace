import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const args = isRecord(body?.arguments) ? body.arguments : {};

  return jsonResponse({
    status: "success",
    result: {
      provider: "mock-provider",
      capability_id:
        typeof body?.capability_id === "string" ? body.capability_id : null,
      echo: args,
      summary:
        "Demo provider endpoint received a paid marketplace task packet.",
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
