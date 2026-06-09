import { type NextRequest } from "next/server";

import { CORS_HEADERS } from "@/lib/http";
import { getBaseUrl } from "@/lib/marketplace/manifest";

export function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  return new Response(
    [
      "# x402 Agent Marketplace",
      "",
      "This site exposes a framework-neutral HTTP marketplace for agent tools and capabilities.",
      "",
      "Machine-readable entry points:",
      `- Manifest: ${baseUrl}/api/manifest`,
      `- OpenAPI: ${baseUrl}/api/openapi`,
      `- Search: ${baseUrl}/api/search?q=sec%20analysis`,
      `- Capabilities: ${baseUrl}/api/capabilities`,
      "",
      "Agent flow:",
      "1. Search capabilities with GET /api/search or list all with GET /api/capabilities.",
      "2. Create a quote with POST /api/quote and JSON {\"capability_id\":\"sec-analyzer\"}.",
      "3. Pay POST /api/pay?quote_id=<quote_id> with x402. Unpaid requests return HTTP 402 payment requirements.",
      "4. Use the returned execution_token with POST /api/execute.",
      "5. Send a narrow task packet in arguments; do not send full private conversation state.",
      "",
      "Payment:",
      "- Protocol: x402 v2",
      "- Scheme: exact",
      "- Network: eip155:10143",
      "- Asset: Monad testnet USDC",
      "",
    ].join("\n"),
    {
      headers: {
        ...CORS_HEADERS,
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
}
