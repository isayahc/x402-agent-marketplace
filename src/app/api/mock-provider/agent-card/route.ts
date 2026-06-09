import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getBaseUrl } from "@/lib/marketplace/manifest";
import type { A2AAgentCard } from "@/lib/marketplace/types";

export function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request).replace(/\/+$/, "");
  const card: A2AAgentCard = {
    protocolVersion: "0.3.0",
    name: "Mock Provider Agent",
    description:
      "Local demo A2A provider that returns a completed structured task.",
    url: `${baseUrl}/api/mock-provider/a2a`,
    preferredTransport: "JSONRPC",
    version: "0.1.0",
    provider: {
      organization: "x402 Agent Marketplace Demo",
      url: baseUrl,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "compliance-snapshot",
        name: "Compliance Snapshot",
        description:
          "Accepts a paid task packet and returns a compact structured result.",
        tags: ["compliance_check", "risk_summary", "structured_output"],
        inputModes: ["application/json", "text/plain"],
        outputModes: ["application/json"],
      },
    ],
  };

  return jsonResponse(card);
}

export function OPTIONS() {
  return optionsResponse();
}
