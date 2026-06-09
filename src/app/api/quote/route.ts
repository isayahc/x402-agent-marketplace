import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { createQuote } from "@/lib/marketplace/quotes";
import type { QuoteRequest } from "@/lib/marketplace/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as QuoteRequest | null;

  if (!isRecord(body) || typeof body.capability_id !== "string") {
    return jsonResponse(
      {
        error: "invalid_quote_request",
        message: "POST JSON with capability_id is required.",
      },
      { status: 400 },
    );
  }

  try {
    return jsonResponse(createQuote(body.capability_id));
  } catch (error) {
    return jsonResponse(
      {
        error: "quote_failed",
        message: error instanceof Error ? error.message : "Unable to quote.",
      },
      { status: 400 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
