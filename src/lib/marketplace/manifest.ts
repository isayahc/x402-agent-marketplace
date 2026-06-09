import type { MarketplaceManifest } from "./types";

export function getMarketplaceManifest(baseUrl: string): MarketplaceManifest {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    name: "x402 Agent Marketplace",
    description:
      "Framework-neutral capability marketplace for agents to discover, quote, pay for, and execute tools on Monad testnet.",
    version: "0.1.0",
    protocol: {
      payment: "x402",
      x402Version: 2,
      scheme: "exact",
      network: "eip155:10143",
      settlementAsset: "monad-testnet-usdc",
    },
    agentInterfaces: {
      manifest: `${normalizedBaseUrl}/api/manifest`,
      openapi: `${normalizedBaseUrl}/api/openapi`,
      llms: `${normalizedBaseUrl}/llms.txt`,
      search: `${normalizedBaseUrl}/api/search`,
      capabilities: `${normalizedBaseUrl}/api/capabilities`,
      quote: `${normalizedBaseUrl}/api/quote`,
      pay: `${normalizedBaseUrl}/api/pay?quote_id={quote_id}`,
      execute: `${normalizedBaseUrl}/api/execute`,
      providers: `${normalizedBaseUrl}/api/providers`,
      provider_registration: `${normalizedBaseUrl}/api/providers/register`,
      provider_capabilities: `${normalizedBaseUrl}/api/providers/{provider_id}/capabilities`,
      a2a_message_send: `${normalizedBaseUrl}/api/a2a/message:send`,
      a2a_task: `${normalizedBaseUrl}/api/a2a/tasks/{task_id}`,
      a2a_runs: `${normalizedBaseUrl}/api/a2a/runs`,
    },
    flow: [
      "Search or list capabilities.",
      "Create a quote with POST /api/quote.",
      "Pay POST /api/pay?quote_id=<quote_id> with x402.",
      "Use the returned execution_token with POST /api/execute.",
      "Send only a narrow task packet in execute.arguments.",
      "Seller agents can register with POST /api/providers/register and publish capabilities under their provider id.",
      "For A2A routing, pay a quote and send the returned execution_token with POST /api/a2a/message:send.",
    ],
  };
}

export function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
