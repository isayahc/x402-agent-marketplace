import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { registerProvider } from "@/lib/marketplace/registry";
import type { ProviderRegistrationRequest } from "@/lib/marketplace/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | ProviderRegistrationRequest
    | null;

  if (!isRecord(body)) {
    return jsonResponse(
      {
        error: "invalid_provider_registration",
        message:
          "POST JSON with provider_id, name, endpoint_url, and pay_to is required.",
      },
      { status: 400 },
    );
  }

  try {
    return jsonResponse(registerProvider(body), { status: 201 });
  } catch (error) {
    return jsonResponse(
      {
        error: "provider_registration_failed",
        message:
          error instanceof Error ? error.message : "Unable to register provider.",
      },
      { status: 400 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
