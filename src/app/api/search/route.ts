import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { searchCapabilities } from "@/lib/marketplace/search";
import type {
  CapabilitySearchRequest,
  MarketplaceArchitecture,
} from "@/lib/marketplace/types";

const ARCHITECTURES = new Set<MarketplaceArchitecture>([
  "direct-tool-rental",
  "agent-as-a-service",
  "capability-leasing",
]);

function parseArchitecture(value: string | null) {
  if (!value || !ARCHITECTURES.has(value as MarketplaceArchitecture)) {
    return undefined;
  }

  return value as MarketplaceArchitecture;
}

function requestFromUrl(request: NextRequest): CapabilitySearchRequest {
  return {
    query: request.nextUrl.searchParams.get("q") ?? undefined,
    architecture: parseArchitecture(
      request.nextUrl.searchParams.get("architecture"),
    ),
    capability: request.nextUrl.searchParams.get("capability") ?? undefined,
    max_price: request.nextUrl.searchParams.get("max_price") ?? undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requestFromBody(value: unknown): CapabilitySearchRequest {
  if (!isRecord(value)) {
    return {};
  }

  return {
    query: typeof value.query === "string" ? value.query : undefined,
    architecture:
      typeof value.architecture === "string"
        ? parseArchitecture(value.architecture)
        : undefined,
    capability:
      typeof value.capability === "string" ? value.capability : undefined,
    max_price: typeof value.max_price === "string" ? value.max_price : undefined,
  };
}

export async function GET(request: NextRequest) {
  return jsonResponse(searchCapabilities(requestFromUrl(request)));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return jsonResponse(searchCapabilities(requestFromBody(body)));
}

export function OPTIONS() {
  return optionsResponse();
}
