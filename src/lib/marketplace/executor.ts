import { getCapability } from "./capabilities";
import type { ExecuteResponse, ExecutionTokenPayload } from "./types";

function requireString(
  input: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = input[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function executeCapability({
  token,
  args,
}: {
  token: ExecutionTokenPayload;
  args: Record<string, unknown>;
}): ExecuteResponse {
  const capability = getCapability(token.capability_id);

  if (!capability) {
    throw new Error(`Unknown capability: ${token.capability_id}`);
  }

  let result: Record<string, unknown>;

  if (capability.id === "ocr-basic") {
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
