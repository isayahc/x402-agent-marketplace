import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_LOG_FILE = "logs/agent-runs.jsonl";
const SECRET_FIELD_PATTERN = /key|secret|token|private|password/i;

export type AgentName = "seller-agent" | "buyer-agent" | "agent-demo";

export type AgentLogEvent = {
  runId: string;
  agent: AgentName;
  event: string;
  message: string;
  data?: Record<string, unknown>;
};

export function createRunId(prefix = "agent-run") {
  return `${prefix}-${randomUUID()}`;
}

export function getAgentLogFile() {
  return process.env.AGENT_LOG_FILE?.trim() || DEFAULT_LOG_FILE;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SECRET_FIELD_PATTERN.test(key) ? "[redacted]" : redact(entry),
      ]),
    );
  }

  return value;
}

export async function appendAgentLog(event: AgentLogEvent) {
  const logFile = path.resolve(process.cwd(), getAgentLogFile());
  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
    data: event.data ? redact(event.data) : undefined,
  };

  await mkdir(path.dirname(logFile), { recursive: true });
  await appendFile(logFile, `${JSON.stringify(entry)}\n`, "utf8");
}

export function createAgentLogger(runId: string) {
  return async function logAgentEvent(
    agent: AgentName,
    event: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    await appendAgentLog({
      runId,
      agent,
      event,
      message,
      data,
    });
  };
}
