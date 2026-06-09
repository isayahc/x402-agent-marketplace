import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getA2ATask } from "@/lib/marketplace/a2a";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { taskId } = await context.params;
  const task = getA2ATask(taskId);

  if (!task) {
    return jsonResponse(
      {
        error: "task_not_found",
        message: `Unknown A2A task: ${taskId}`,
      },
      { status: 404 },
    );
  }

  return jsonResponse(task);
}

export function OPTIONS() {
  return optionsResponse();
}
