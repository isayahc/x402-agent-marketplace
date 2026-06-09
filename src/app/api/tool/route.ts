import { NextResponse, type NextRequest } from "next/server";
import { withX402 } from "@x402/next";

import { optionsResponse } from "@/lib/http";
import { createMonadRouteConfig, createMonadX402Server } from "@/lib/x402-server";

const server = createMonadX402Server();

const routeConfig = createMonadRouteConfig({
  resource: "/api/tool",
  description: "Mock compliance-check tool invocation",
  unpaidResponseBody: () => ({
    contentType: "application/json",
    body: {
      error: "payment_required",
      resource: "/api/tool",
    },
  }),
});

async function handler(_request: NextRequest) {
  return NextResponse.json({
    tool: "compliance-check",
    status: "completed",
    result: {
      decision: "approved",
      riskScore: 0.07,
      checks: [
        {
          id: "sanctions-screen",
          status: "passed",
          summary: "No sanctioned-party indicators found in the mock review.",
        },
        {
          id: "policy-fit",
          status: "passed",
          summary: "Request fits the hackathon marketplace policy profile.",
        },
      ],
    },
    completedAt: new Date().toISOString(),
  });
}

export const GET = withX402(handler, routeConfig, server);

export function OPTIONS() {
  return optionsResponse();
}
