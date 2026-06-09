import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getBaseUrl } from "@/lib/marketplace/manifest";
import { getProviderAgentCard } from "@/lib/marketplace/registry";

type RouteContext = {
  params: Promise<{
    providerId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { providerId } = await context.params;

  try {
    return jsonResponse(
      getProviderAgentCard({
        providerId,
        baseUrl: getBaseUrl(request),
      }),
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "agent_card_not_found",
        message:
          error instanceof Error ? error.message : "Unable to build agent card.",
      },
      { status: 404 },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
