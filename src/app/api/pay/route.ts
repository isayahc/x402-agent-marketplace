import { NextResponse, type NextRequest } from "next/server";
import { withX402 } from "@x402/next";
import type { HTTPRequestContext } from "@x402/core/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { createExecutionToken, verifyQuote } from "@/lib/marketplace/quotes";
import type { PayResponse } from "@/lib/marketplace/types";
import { envAddress } from "@/lib/x402-config";
import { createMonadRouteConfig, createMonadX402Server } from "@/lib/x402-server";

const server = createMonadX402Server();

type PayErrorResponse = {
  error: string;
  message: string;
};

function getQuoteIdFromUrl(request: NextRequest) {
  return request.nextUrl.searchParams.get("quote_id") ?? "";
}

const routeConfig = createMonadRouteConfig({
  resource: "/api/pay",
  description: "Pay a capability quote and receive a signed execution token",
  payTo: async (context: HTTPRequestContext) => {
    const quoteId = context.adapter.getQueryParam?.("quote_id");
    const quoteIdString = Array.isArray(quoteId) ? quoteId[0] : quoteId;

    if (!quoteIdString) {
      return envAddress("PAY_TO_ADDRESS");
    }

    return verifyQuote(quoteIdString).pay_to;
  },
  price: async (context: HTTPRequestContext) => {
    const quoteId = context.adapter.getQueryParam?.("quote_id");
    const quoteIdString = Array.isArray(quoteId) ? quoteId[0] : quoteId;

    if (!quoteIdString) {
      return "$0.01";
    }

    return verifyQuote(quoteIdString).x402_price;
  },
  unpaidResponseBody: (context) => {
    const quoteId = context.adapter.getQueryParam?.("quote_id");

    return {
      contentType: "application/json",
      body: {
        error: "payment_required",
        message: quoteId
          ? "Pay this x402 quote to receive an execution token."
          : "quote_id query parameter is required.",
      },
    };
  },
});

async function handler(
  request: NextRequest,
): Promise<NextResponse<PayResponse | PayErrorResponse>> {
  const quoteId = getQuoteIdFromUrl(request);

  if (!quoteId) {
    return jsonResponse(
      {
        error: "missing_quote_id",
        message: "Add quote_id as a query parameter.",
      },
      { status: 400 },
    );
  }

  try {
    const quote = verifyQuote(quoteId);
    const response: PayResponse = {
      status: "paid",
      quote_id: quote.quote_id,
      capability_id: quote.capability_id,
      execution_token: createExecutionToken(quote),
      execute: {
        method: "POST",
        endpoint: "/api/execute",
      },
    };

    return jsonResponse(response);
  } catch (error) {
    return jsonResponse(
      {
        error: "invalid_quote",
        message: error instanceof Error ? error.message : "Invalid quote.",
      },
      { status: 400 },
    );
  }
}

export const POST = withX402<PayResponse | PayErrorResponse>(
  handler,
  routeConfig,
  server,
);

export function OPTIONS() {
  return optionsResponse();
}
