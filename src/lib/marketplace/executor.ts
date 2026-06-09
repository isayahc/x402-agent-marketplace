import { getCapability } from "./registry";
import type { Capability, ExecuteResponse, ExecutionTokenPayload } from "./types";

const PROVIDER_TIMEOUT_MS = 15_000;

function requireString(
  input: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = input[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function executeProviderCapability({
  capability,
  token,
  args,
}: {
  capability: Capability;
  token: ExecutionTokenPayload;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (!capability.seller?.endpoint_url) {
    throw new Error(`Capability ${capability.id} has no provider endpoint`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(capability.seller.endpoint_url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-marketplace-provider": "x402-agent-marketplace",
      },
      body: JSON.stringify({
        capability_id: capability.id,
        quote_id: token.quote_id,
        paid_at: token.paid_at,
        arguments: args,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(
        `Provider returned HTTP ${response.status}: ${JSON.stringify(parsed)}`,
      );
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "result" in parsed &&
      parsed.result &&
      typeof parsed.result === "object" &&
      !Array.isArray(parsed.result)
    ) {
      return parsed.result as Record<string, unknown>;
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return { value: parsed };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Provider returned invalid JSON");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Provider timed out before returning a result");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeCapability({
  token,
  args,
}: {
  token: ExecutionTokenPayload;
  args: Record<string, unknown>;
}): Promise<ExecuteResponse> {
  const capability = getCapability(token.capability_id);

  if (!capability) {
    throw new Error(`Unknown capability: ${token.capability_id}`);
  }

  let result: Record<string, unknown>;

  if (capability.seller?.mode === "provider") {
    result = await executeProviderCapability({ capability, token, args });
  } else if (capability.id === "ocr-basic") {
    const imageUrl = requireString(args, "image_url", "mock://invoice.png");
    result = {
      text: "Invoice #123. Balance due: 0.05 USDC. Payment terms: net 15.",
      source: imageUrl,
      confidence: 0.98,
    };
  } else if (capability.id === "lead-research-agent") {
    const market = requireString(args, "market", "climate startups");
    const geography = requireString(args, "geography", "NYC");
    const stage = requireString(args, "stage", "Series A");
    result = {
      companies: [
        {
          name: "Gridwise Carbon",
          geography,
          stage,
          fit_score: 0.91,
        },
        {
          name: "Harbor Heatmaps",
          geography,
          stage,
          fit_score: 0.86,
        },
      ],
      reasoning_summary: `Mock provider agent ranked ${market} in ${geography} by funding stage, public traction, and data completeness.`,
    };
  } else {
    const company = requireString(args, "company", "Example Corp");
    const focus = requireString(args, "focus", "financial risks");
    result = {
      risks: [
        {
          category: "liquidity",
          severity: "medium",
          summary: `${company} may face working-capital pressure if financing conditions tighten.`,
        },
        {
          category: "market",
          severity: "medium",
          summary: `The requested focus area, ${focus}, is sensitive to demand volatility and supplier concentration.`,
        },
      ],
      reasoning_summary:
        "Mock SEC filing analysis used only the supplied task packet and returned structured findings.",
    };
  }

  return {
    status: "success",
    quote_id: token.quote_id,
    capability_id: capability.id,
    architecture: capability.architecture,
    result,
    completed_at: new Date().toISOString(),
  };
}
