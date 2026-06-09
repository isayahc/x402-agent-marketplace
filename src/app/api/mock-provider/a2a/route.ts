import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import type {
  A2AMessage,
  A2ASendMessageRequest,
  A2ASendMessageResponse,
  A2ATask,
} from "@/lib/marketplace/types";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number;
  method?: string;
  params?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textFromMessage(message: A2AMessage) {
  return message.parts
    .map((part) => (part.kind === "text" ? part.text : JSON.stringify(part.data)))
    .join("\n")
    .trim();
}

function createTask(request: A2ASendMessageRequest): A2ATask {
  const taskId = randomUUID();
  const prompt = textFromMessage(request.message);

  return {
    kind: "task",
    id: taskId,
    contextId: request.message.contextId ?? taskId,
    status: {
      state: "completed",
      timestamp: new Date().toISOString(),
    },
    history: [request.message],
    artifacts: [
      {
        artifactId: randomUUID(),
        name: "mock-provider-result",
        parts: [
          {
            kind: "data",
            data: {
              summary:
                "Mock A2A provider completed the paid task packet and returned structured output.",
              risk_level: "low",
              recommendations: [
                "Keep task packets narrow.",
                "Do not forward private buyer context unless required.",
              ],
              prompt,
              marketplace: request.metadata?.marketplace,
            },
          },
        ],
      },
    ],
    metadata: {
      provider: "mock-provider-a2a",
      marketplace: request.metadata?.marketplace,
    },
  };
}

function jsonRpcResponse(
  id: string | number | undefined,
  response: A2ASendMessageResponse,
) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result: response,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;

  if (!isRecord(body)) {
    return jsonResponse(
      {
        error: {
          code: -32600,
          message: "Invalid A2A request",
        },
      },
      { status: 400 },
    );
  }

  if (body.jsonrpc === "2.0") {
    if (body.method !== "message/send") {
      return jsonResponse({
        jsonrpc: "2.0",
        id: body.id ?? null,
        error: {
          code: -32601,
          message: "Unsupported method",
        },
      });
    }

    const params = body.params as A2ASendMessageRequest;
    const task = createTask(params);
    return jsonResponse(jsonRpcResponse(body.id, { task }));
  }

  const task = createTask(body as A2ASendMessageRequest);
  return jsonResponse({ task });
}

export function OPTIONS() {
  return optionsResponse();
}
