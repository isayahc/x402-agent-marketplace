import "../lib/load-env";

import {
  createAgentLogger,
  createRunId,
  getAgentLogFile,
} from "../lib/agent-logs";
import { completeAgentJson } from "../lib/openai-agent";
import { registerSellerCapability } from "../seller";
import type {
  Capability,
  CapabilityRegistrationRequest,
  ProviderRegistrationResponse,
} from "../lib/marketplace/types";

type AgentLogger = ReturnType<typeof createAgentLogger>;

type SellerPlan = {
  capability_id: string;
  name: string;
  summary: string;
  capabilities: string[];
  price: string | number;
};

const FALLBACK_SELLER_PLAN: SellerPlan = {
  capability_id: "compliance-snapshot",
  name: "Compliance Snapshot Agent",
  summary:
    "Reviews a short task packet and returns a structured compliance-style snapshot.",
  capabilities: ["compliance_check", "risk_summary", "structured_output"],
  price: "0.02",
};

function optionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function normalizePlan(plan: SellerPlan): SellerPlan {
  const price = String(plan.price ?? "");

  return {
    capability_id: plan.capability_id || FALLBACK_SELLER_PLAN.capability_id,
    name: plan.name || FALLBACK_SELLER_PLAN.name,
    summary: plan.summary || FALLBACK_SELLER_PLAN.summary,
    capabilities: Array.isArray(plan.capabilities) && plan.capabilities.length
      ? plan.capabilities
      : FALLBACK_SELLER_PLAN.capabilities,
    price: /^\d+(\.\d+)?$/.test(price) ? price : FALLBACK_SELLER_PLAN.price,
  };
}

function capabilityFromPlan(plan: SellerPlan): CapabilityRegistrationRequest {
  return {
    id: plan.capability_id,
    name: plan.name,
    architecture: "agent-as-a-service",
    summary: plan.summary,
    capabilities: plan.capabilities,
    input_schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string" },
        constraints: { type: "object" },
      },
    },
    output_schema: {
      type: "object",
      required: ["summary"],
      properties: {
        summary: { type: "string" },
        risk_level: { type: "string" },
        recommendations: { type: "array" },
      },
    },
    price: {
      base: String(plan.price),
      marketplace_fee_bps: Number.parseInt(
        optionalEnv("SELLER_MARKETPLACE_FEE_BPS") ?? "0",
        10,
      ),
    },
  };
}

export async function runSellerAgent({
  runId,
  log,
}: {
  runId: string;
  log: AgentLogger;
}): Promise<{
  registration: ProviderRegistrationResponse;
  capability: Capability;
}> {
  const goal =
    optionalEnv("SELLER_SERVICE_GOAL") ??
    "Sell a small compliance or risk-analysis service to buyer agents.";

  await log("seller-agent", "started", "Seller agent is preparing a service.", {
    goal,
  });

  const planned = await completeAgentJson<SellerPlan>({
    system:
      "You are a seller agent creating a tiny paid capability listing for an agent marketplace.",
    user: [
      `Goal: ${goal}`,
      "Return JSON with capability_id, name, summary, capabilities, and price.",
      "Use a short kebab-case capability_id, 3 snake_case capabilities, and a decimal USDC price under 0.10.",
    ].join("\n"),
    fallback: FALLBACK_SELLER_PLAN,
  });
  const plan = normalizePlan(planned.data);

  await log(
    "seller-agent",
    planned.usedOpenAI ? "openai_plan_created" : "fallback_plan_created",
    planned.usedOpenAI
      ? "Seller agent created a listing plan with OpenAI."
      : "Seller agent used the deterministic fallback listing plan.",
    {
      plan,
      model: planned.usedOpenAI ? planned.model : undefined,
      reason: planned.usedOpenAI ? undefined : planned.reason,
    },
  );

  const registration = await registerSellerCapability({
    providerName: optionalEnv("SELLER_NAME") ?? "Simple Seller Agent",
    capability: capabilityFromPlan(plan),
  });

  await log(
    "seller-agent",
    "capability_published",
    "Seller agent published a capability.",
    {
      provider: registration.registration.provider,
      capability: registration.capability,
    },
  );

  return registration;
}

async function main() {
  const runId = createRunId("seller");
  const log = createAgentLogger(runId);
  const result = await runSellerAgent({ runId, log });

  console.log("Seller agent published:");
  console.log(JSON.stringify(result.capability, null, 2));
  console.log(`Logs: ${getAgentLogFile()}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
