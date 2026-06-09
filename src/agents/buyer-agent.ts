import "../lib/load-env";

import {
  createAgentLogger,
  createRunId,
  getAgentLogFile,
} from "../lib/agent-logs";
import { completeAgentJson } from "../lib/openai-agent";
import { requestA2ACapability, searchTools } from "../agent";
import {
  DEFAULT_PROVIDER_URL,
  envString,
  explorerTxUrl,
} from "../lib/x402-config";
import type {
  CapabilitySearchResult,
  QuoteResponse,
} from "../lib/marketplace/types";

type AgentLogger = ReturnType<typeof createAgentLogger>;

type BuyerPlan = {
  query: string;
  reason: string;
  arguments: Record<string, unknown>;
};

const FALLBACK_BUYER_PLAN: BuyerPlan = {
  query: "compliance risk structured output",
  reason: "The buyer needs a simple structured compliance check.",
  arguments: {
    prompt:
      "Review this vendor onboarding note and return a compact compliance snapshot.",
    constraints: {
      max_words: 120,
      include_recommendations: true,
    },
  },
};

function optionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function getMarketplaceUrl() {
  return envString("PROVIDER_URL", DEFAULT_PROVIDER_URL).replace(/\/+$/, "");
}

function shouldPay() {
  return /^(1|true|yes)$/i.test(optionalEnv("AGENTS_PAY") ?? "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePlan(plan: BuyerPlan): BuyerPlan {
  return {
    query: plan.query || FALLBACK_BUYER_PLAN.query,
    reason: plan.reason || FALLBACK_BUYER_PLAN.reason,
    arguments: isRecord(plan.arguments)
      ? plan.arguments
      : FALLBACK_BUYER_PLAN.arguments,
  };
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const body = await response.text().catch(() => "");
  throw new Error(body || `HTTP ${response.status} ${response.statusText}`);
}

async function createQuote(
  capabilityId: string,
  args: Record<string, unknown>,
): Promise<QuoteResponse> {
  const response = await fetch(new URL("/api/quote", getMarketplaceUrl()), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      capability_id: capabilityId,
      arguments: args,
    }),
  });

  return readJsonOrThrow<QuoteResponse>(response);
}

function selectCapability({
  results,
  preferredCapabilityId,
}: {
  results: CapabilitySearchResult[];
  preferredCapabilityId?: string;
}) {
  return (
    results.find((capability) => capability.id === preferredCapabilityId) ??
    results[0]
  );
}

export async function runBuyerAgent({
  runId,
  log,
  preferredCapabilityId,
}: {
  runId: string;
  log: AgentLogger;
  preferredCapabilityId?: string;
}): Promise<{
  plan: BuyerPlan;
  selected?: CapabilitySearchResult;
  quote?: QuoteResponse;
  execution?: Record<string, unknown>;
  settlementTx?: string;
}> {
  const goal =
    optionalEnv("BUYER_SERVICE_GOAL") ??
    "Find a low-cost agent service that can produce a compliance-style structured output.";

  await log("buyer-agent", "started", "Buyer agent is looking for a service.", {
    goal,
    preferredCapabilityId,
  });

  const planned = await completeAgentJson<BuyerPlan>({
    system:
      "You are a buyer agent searching an HTTP marketplace for a paid service.",
    user: [
      `Goal: ${goal}`,
      "Return JSON with query, reason, and arguments.",
      "The arguments object should be a narrow task packet for the seller service.",
    ].join("\n"),
    fallback: FALLBACK_BUYER_PLAN,
  });
  const plan = normalizePlan(planned.data);

  await log(
    "buyer-agent",
    planned.usedOpenAI ? "openai_plan_created" : "fallback_plan_created",
    planned.usedOpenAI
      ? "Buyer agent created a search plan with OpenAI."
      : "Buyer agent used the deterministic fallback search plan.",
    {
      plan,
      model: planned.usedOpenAI ? planned.model : undefined,
      reason: planned.usedOpenAI ? undefined : planned.reason,
    },
  );

  const results = await searchTools(plan.query);
  const selected = selectCapability({ results, preferredCapabilityId });

  await log("buyer-agent", "search_completed", "Buyer agent searched services.", {
    query: plan.query,
    resultCount: results.length,
    selectedCapabilityId: selected?.id,
  });

  if (!selected) {
    await log(
      "buyer-agent",
      "no_service_found",
      "Buyer agent did not find a matching service.",
      { query: plan.query },
    );

    return {
      plan,
    };
  }

  const quote = await createQuote(selected.id, plan.arguments);

  await log("buyer-agent", "quote_created", "Buyer agent created a quote.", {
    capabilityId: selected.id,
    cost: quote.cost,
    currency: quote.currency,
    payTo: quote.pay_to,
    paymentReceiver: quote.payment_receiver,
  });

  if (!shouldPay()) {
    await log(
      "buyer-agent",
      "payment_skipped",
      "Buyer agent stopped after quote because AGENTS_PAY is not true.",
      { capabilityId: selected.id },
    );

    return {
      plan,
      selected,
      quote,
    };
  }

  const paid = await requestA2ACapability({
    capabilityId: selected.id,
    arguments: plan.arguments,
  });
  const settlementTx = paid.settlement?.transaction;

  await log(
    "buyer-agent",
    "execution_completed",
    "Buyer agent paid for and executed the service.",
    {
      capabilityId: selected.id,
      settlementTx,
      explorer: settlementTx ? explorerTxUrl(settlementTx) : undefined,
      result: paid.result,
    },
  );

  return {
    plan,
    selected,
    quote,
    execution: paid.result,
    settlementTx,
  };
}

async function main() {
  const runId = createRunId("buyer");
  const log = createAgentLogger(runId);
  const result = await runBuyerAgent({
    runId,
    log,
    preferredCapabilityId: optionalEnv("CAPABILITY_ID"),
  });

  console.log("Buyer agent result:");
  console.log(JSON.stringify(result, null, 2));
  console.log(`Logs: ${getAgentLogFile()}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
