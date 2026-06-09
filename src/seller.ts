import "./lib/load-env";

import {
  DEFAULT_PROVIDER_URL,
  envString,
} from "./lib/x402-config";
import type {
  Capability,
  CapabilityRegistrationRequest,
  ProviderRegistrationResponse,
} from "./lib/marketplace/types";

export type SellerCapabilityOptions = {
  providerId?: string;
  providerName?: string;
  endpointUrl?: string;
  a2aEndpointUrl?: string;
  agentCardUrl?: string;
  payTo?: string;
  contact?: string;
  capability?: CapabilityRegistrationRequest;
};

const DEMO_PAY_TO_ADDRESS = "0x0000000000000000000000000000000000000002";

function getMarketplaceUrl() {
  return envString("PROVIDER_URL", DEFAULT_PROVIDER_URL).replace(/\/+$/, "");
}

function optionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

function isEvmAddress(value: string | undefined): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function shouldPay() {
  return /^(1|true|yes)$/i.test(optionalEnv("AGENTS_PAY") ?? "");
}

function resolveSellerPayTo(payTo?: string) {
  const candidate =
    payTo ?? optionalEnv("SELLER_PAY_TO_ADDRESS") ?? optionalEnv("PAY_TO_ADDRESS");

  if (isEvmAddress(candidate)) {
    return candidate;
  }

  if (!shouldPay()) {
    return DEMO_PAY_TO_ADDRESS;
  }

  throw new Error(
    "SELLER_PAY_TO_ADDRESS or PAY_TO_ADDRESS must be a valid 20-byte EVM address when AGENTS_PAY=true.",
  );
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const body = await response.text().catch(() => "");
  throw new Error(body || `HTTP ${response.status} ${response.statusText}`);
}

async function postJson<T>({
  url,
  body,
  token,
}: {
  url: URL;
  body: Record<string, unknown>;
  token?: string;
}) {
  const headers: HeadersInit = {
    accept: "application/json",
    "content-type": "application/json",
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return readJsonOrThrow<T>(response);
}

function defaultCapability(): CapabilityRegistrationRequest {
  return {
    id: optionalEnv("SELLER_CAPABILITY_ID") ?? "demo-analysis",
    name: optionalEnv("SELLER_CAPABILITY_NAME") ?? "Demo Analysis Agent",
    architecture: "agent-as-a-service",
    summary:
      "Demo seller agent that accepts a paid task packet and returns structured JSON.",
    capabilities: ["demo_analysis", "agent_provider", "structured_output"],
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
    },
    output_schema: {
      type: "object",
      required: ["summary"],
      properties: {
        summary: { type: "string" },
      },
    },
    price: {
      base: optionalEnv("SELLER_PRICE") ?? "0.02",
      marketplace_fee_bps: Number.parseInt(
        optionalEnv("SELLER_MARKETPLACE_FEE_BPS") ?? "0",
        10,
      ),
    },
  };
}

export async function registerSellerCapability(
  options: SellerCapabilityOptions = {},
) {
  const marketplaceUrl = getMarketplaceUrl();
  const providerId =
    options.providerId ??
    optionalEnv("SELLER_PROVIDER_ID") ??
    `demo-provider-${Date.now()}`;
  const providerName =
    options.providerName ?? optionalEnv("SELLER_NAME") ?? "Demo Seller Agent";
  const endpointUrl =
    options.endpointUrl ??
    optionalEnv("SELLER_ENDPOINT_URL") ??
    `${marketplaceUrl}/api/mock-provider`;
  const a2aEndpointUrl =
    options.a2aEndpointUrl ??
    optionalEnv("SELLER_A2A_ENDPOINT_URL") ??
    `${marketplaceUrl}/api/mock-provider/a2a`;
  const agentCardUrl =
    options.agentCardUrl ??
    optionalEnv("SELLER_AGENT_CARD_URL") ??
    `${marketplaceUrl}/api/mock-provider/agent-card`;
  const payTo = resolveSellerPayTo(options.payTo);

  const registrationUrl = new URL("/api/providers/register", marketplaceUrl);
  const registration = await postJson<ProviderRegistrationResponse>({
    url: registrationUrl,
    body: {
      provider_id: providerId,
      name: providerName,
      endpoint_url: endpointUrl,
      a2a_endpoint_url: a2aEndpointUrl,
      agent_card_url: agentCardUrl,
      a2a_protocol_binding: "JSONRPC",
      pay_to: payTo,
      contact: options.contact ?? optionalEnv("SELLER_CONTACT"),
    },
  });

  const fallbackCapability = defaultCapability();
  const capability: CapabilityRegistrationRequest = {
    ...fallbackCapability,
    ...options.capability,
    price: {
      ...fallbackCapability.price,
      ...options.capability?.price,
    },
  };

  const capabilityUrl = new URL(
    registration.routes.add_capability,
    marketplaceUrl,
  );
  const publishedCapability = await postJson<Capability>({
    url: capabilityUrl,
    token: registration.provider_token,
    body: capability,
  });

  return {
    registration,
    capability: publishedCapability,
  };
}

async function main() {
  const { registration, capability } = await registerSellerCapability();

  console.log("Registered seller provider:");
  console.log(JSON.stringify(registration.provider, null, 2));
  console.log("Provider token:");
  console.log(registration.provider_token);
  console.log("Published capability:");
  console.log(JSON.stringify(capability, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
