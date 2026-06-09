import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getA2AInterfaceRun } from "@/lib/marketplace/a2a";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { runId } = await context.params;
  const run = getA2AInterfaceRun(runId);

  if (!run) {
    return jsonResponse(
      {
        error: "run_not_found",
        message: `Unknown A2A interface run: ${runId}`,
      },
      { status: 404 },
    );
  }

  return jsonResponse(run);
}

export function OPTIONS() {
  return optionsResponse();
}
