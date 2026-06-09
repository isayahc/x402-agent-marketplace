import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  listProviderCapabilities,
  registerProviderCapability,
} from "@/lib/marketplace/registry";
import type { CapabilityRegistrationRequest } from "@/lib/marketplace/types";

type RouteContext = {
  params: Promise<{
    providerId: string;
  }>;
};

function providerTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return request.headers.get("x-provider-token")?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { providerId } = await context.params;
  return jsonResponse(listProviderCapabilities(providerId));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { providerId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | CapabilityRegistrationRequest
    | null;

  if (!isRecord(body)) {
    return jsonResponse(
      {
        error: "invalid_capability_registration",
        message: "POST JSON capability metadata is required.",
      },
      { status: 400 },
    );
  }

  try {
    const capability = registerProviderCapability({
      providerId,
      providerToken: providerTokenFromRequest(request),
      request: body,
    });

    return jsonResponse(capability, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to publish capability.";

    return jsonResponse(
      {
        error: message === "Invalid provider token" ? "unauthorized" : "failed",
        message,
      },
      { status: message === "Invalid provider token" ? 401 : 400 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
