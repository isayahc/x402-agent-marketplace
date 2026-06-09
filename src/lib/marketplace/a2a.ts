import { randomUUID } from "node:crypto";

import { getCapability } from "./registry";
import { verifyExecutionToken } from "./quotes";
import type {
  A2AInterfaceRun,
  A2AInterfaceRunEvent,
  A2AMessage,
  A2AProtocolBinding,
  A2ASendMessageRequest,
  A2ASendMessageResponse,
  A2ATask,
  A2ATaskState,
  PaidA2ASendMessageRequest,
} from "./types";

const A2A_TIMEOUT_MS = 20_000;
const A2A_SYMBOL = Symbol.for("x402-agent-marketplace.a2a-runs");

type A2AState = {
  runs: Map<string, A2AInterfaceRun>;
  taskToRun: Map<string, string>;
};

type GlobalWithA2A = typeof globalThis & {
  [A2A_SYMBOL]?: A2AState;
};

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

function state(): A2AState {
  const globalState = globalThis as GlobalWithA2A;

  if (!globalState[A2A_SYMBOL]) {
    globalState[A2A_SYMBOL] = {
      runs: new Map(),
      taskToRun: new Map(),
    };
  }

  return globalState[A2A_SYMBOL];
}

function now() {
  return new Date().toISOString();
}

function event(
  eventName: string,
  message: string,
  data?: Record<string, unknown>,
): A2AInterfaceRunEvent {
  return {
    timestamp: now(),
    event: eventName,
    message,
    data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertMessage(value: unknown): A2AMessage {
  if (!isRecord(value) || value.kind !== "message" || value.role !== "user") {
    throw new Error("A2A request must include a user message");
  }

  if (typeof value.messageId !== "string" || !value.messageId.trim()) {
    throw new Error("A2A message.messageId is required");
  }

  if (!Array.isArray(value.parts) || !value.parts.length) {
    throw new Error("A2A message.parts must include at least one part");
  }

  return value as A2AMessage;
}

function taskFromMessage({
  taskId,
  message,
  state,
  metadata,
}: {
  taskId: string;
  message: A2AMessage;
  state: A2ATaskState;
  metadata?: Record<string, unknown>;
}): A2ATask {
  return {
    kind: "task",
    id: taskId,
    contextId: message.contextId ?? taskId,
    status: {
      state,
      timestamp: now(),
    },
    history: [message],
    metadata,
  };
}

async function parseProviderResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text) as unknown;
}

function normalizeA2AResponse(value: unknown): A2ASendMessageResponse {
  if (isRecord(value) && (value.task || value.message)) {
    return value as A2ASendMessageResponse;
  }

  if (isRecord(value) && value.kind === "task") {
    return {
      task: value as A2ATask,
    };
  }

  return {
    task: {
      kind: "task",
      id: randomUUID(),
      status: {
        state: "completed",
        timestamp: now(),
      },
      artifacts: [
        {
          artifactId: randomUUID(),
          name: "provider-response",
          parts: [
            {
              kind: "data",
              data: isRecord(value) ? value : { value },
            },
          ],
        },
      ],
    },
  };
}

async function forwardToProvider({
  endpointUrl,
  protocolBinding,
  request,
  runId,
}: {
  endpointUrl: string;
  protocolBinding: A2AProtocolBinding;
  request: A2ASendMessageRequest;
  runId: string;
}): Promise<A2ASendMessageResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), A2A_TIMEOUT_MS);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-marketplace-a2a-run": runId,
      },
      body:
        protocolBinding === "JSONRPC"
          ? JSON.stringify({
              jsonrpc: "2.0",
              id: runId,
              method: "message/send",
              params: request,
            })
          : JSON.stringify(request),
      signal: controller.signal,
    });
    const parsed = await parseProviderResponse(response);

    if (!response.ok) {
      throw new Error(
        `A2A provider returned HTTP ${response.status}: ${JSON.stringify(parsed)}`,
      );
    }

    if (protocolBinding === "JSONRPC" && isRecord(parsed)) {
      const jsonRpc = parsed as JsonRpcResponse<A2ASendMessageResponse>;

      if (jsonRpc.error) {
        throw new Error(
          `A2A provider error ${jsonRpc.error.code}: ${jsonRpc.error.message}`,
        );
      }

      return normalizeA2AResponse(jsonRpc.result);
    }

    return normalizeA2AResponse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("A2A provider returned invalid JSON");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A2A provider timed out before returning a task");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function listA2AInterfaceRuns(): A2AInterfaceRun[] {
  return [...state().runs.values()].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

export function getA2AInterfaceRun(runId: string) {
  return state().runs.get(runId);
}

export function getA2ATask(taskId: string): A2ATask | undefined {
  const runId = state().taskToRun.get(taskId);
  const run = runId ? state().runs.get(runId) : undefined;

  if (!run) {
    return undefined;
  }

  return (
    run.response?.task ??
    taskFromMessage({
      taskId: run.task_id,
      message: run.request.message,
      state: run.status,
      metadata: {
        interface_run_id: run.id,
        capability_id: run.capability_id,
        quote_id: run.quote_id,
      },
    })
  );
}

export async function routePaidA2AMessage(
  request: PaidA2ASendMessageRequest,
): Promise<{
  run: A2AInterfaceRun;
  task: A2ATask;
}> {
  if (!request.execution_token) {
    throw new Error("execution_token is required");
  }

  const token = verifyExecutionToken(request.execution_token);

  if (request.quote_id && request.quote_id !== token.quote_id) {
    throw new Error("quote_id does not match execution_token");
  }

  const capability = getCapability(token.capability_id);

  if (!capability) {
    throw new Error(`Unknown capability: ${token.capability_id}`);
  }

  const endpointUrl = capability.seller?.a2a_endpoint_url;

  if (!endpointUrl) {
    throw new Error(
      `Capability ${capability.id} does not advertise an A2A endpoint`,
    );
  }

  const message = assertMessage(request.message);
  const runId = randomUUID();
  const taskId = randomUUID();
  const protocolBinding = capability.seller?.a2a_protocol_binding ?? "JSONRPC";
  const routedRequest: A2ASendMessageRequest = {
    message,
    configuration: request.configuration,
    metadata: {
      ...request.metadata,
      marketplace: {
        interface_run_id: runId,
        quote_id: token.quote_id,
        capability_id: capability.id,
        paid_at: token.paid_at,
      },
    },
  };
  const run: A2AInterfaceRun = {
    id: runId,
    task_id: taskId,
    status: "submitted",
    quote_id: token.quote_id,
    capability_id: capability.id,
    provider_id: capability.provider.id,
    seller_endpoint_url: endpointUrl,
    protocol_binding: protocolBinding,
    request: routedRequest,
    events: [
      event("submitted", "Paid A2A task submitted to marketplace router.", {
        capability_id: capability.id,
      }),
    ],
    created_at: now(),
    updated_at: now(),
  };

  state().runs.set(run.id, run);
  state().taskToRun.set(run.task_id, run.id);

  try {
    run.status = "working";
    run.updated_at = now();
    run.events.push(
      event("forwarding", "Forwarding A2A message to seller endpoint.", {
        endpoint_url: endpointUrl,
        protocol_binding: protocolBinding,
      }),
    );

    const providerResponse = await forwardToProvider({
      endpointUrl,
      protocolBinding,
      request: routedRequest,
      runId,
    });
    const task =
      providerResponse.task ??
      taskFromMessage({
        taskId,
        message,
        state: "completed",
        metadata: {
          interface_run_id: run.id,
          capability_id: capability.id,
        },
      });

    run.status = task.status.state;
    run.remote_task_id = task.id;
    const routedTask: A2ATask = {
      ...task,
      metadata: {
        ...task.metadata,
        interface_run_id: run.id,
        local_task_id: run.task_id,
      },
    };

    run.response = {
      ...providerResponse,
      task: routedTask,
    };
    run.updated_at = now();
    run.events.push(
      event("completed", "Seller endpoint returned an A2A task response.", {
        remote_task_id: task.id,
        state: task.status.state,
      }),
    );
    state().taskToRun.set(task.id, run.id);

    return {
      run,
      task: routedTask,
    };
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : "A2A routing failed";
    run.response = {
      task: taskFromMessage({
        taskId,
        message,
        state: "failed",
        metadata: {
          interface_run_id: run.id,
          error: run.error,
        },
      }),
    };
    run.updated_at = now();
    run.events.push(event("failed", "A2A routing failed.", { error: run.error }));

    throw error;
  }
}
