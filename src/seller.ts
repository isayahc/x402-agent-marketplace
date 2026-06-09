import "dotenv/config";

import {
  DEFAULT_PROVIDER_URL,
  envString,
} from "./lib/x402-config";
import type {
  Capability,
  CapabilityRegistrationRequest,
  ProviderRegistrationResponse,
} from "./lib/marketplace/types";

function getMarketplaceUrl() {
  return envString("PROVIDER_URL", DEFAULT_PROVIDER_URL).replace(/\/+$/, "");
}

function optionalEnv(name: string) {
  return process.env[name]?.trim() || undefined;
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

export async function registerSellerCapability() {
  const marketplaceUrl = getMarketplaceUrl();
  const providerId =
    optionalEnv("SELLER_PROVIDER_ID") ?? `demo-provider-${Date.now()}`;
  const providerName = optionalEnv("SELLER_NAME") ?? "Demo Seller Agent";
  const endpointUrl =
    optionalEnv("SELLER_ENDPOINT_URL") ??
    `${marketplaceUrl}/api/mock-provider`;
  const payTo =
    optionalEnv("SELLER_PAY_TO_ADDRESS") ?? envString("PAY_TO_ADDRESS");

  const registrationUrl = new URL("/api/providers/register", marketplaceUrl);
  const registration = await postJson<ProviderRegistrationResponse>({
    url: registrationUrl,
    body: {
      provider_id: providerId,
      name: providerName,
      endpoint_url: endpointUrl,
      pay_to: payTo,
      contact: optionalEnv("SELLER_CONTACT"),
    },
  });

  const capability: CapabilityRegistrationRequest = {
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
