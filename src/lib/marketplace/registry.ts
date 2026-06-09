import { createHash, randomBytes } from "node:crypto";

import type { Address } from "viem";

import { STATIC_MARKETPLACE_CAPABILITIES } from "./capabilities";
import type {
  Capability,
  CapabilityRegistrationRequest,
  MarketplaceArchitecture,
  ProviderRegistrationRequest,
  ProviderRegistrationResponse,
  RegisteredProvider,
} from "./types";

const ARCHITECTURES = new Set<MarketplaceArchitecture>([
  "direct-tool-rental",
  "agent-as-a-service",
  "capability-leasing",
]);

type ProviderRecord = RegisteredProvider & {
  tokenHash: string;
};

type RegistryState = {
  providers: Map<string, ProviderRecord>;
  capabilities: Map<string, Capability>;
};

const REGISTRY_SYMBOL = Symbol.for("x402-agent-marketplace.registry");

type GlobalWithRegistry = typeof globalThis & {
  [REGISTRY_SYMBOL]?: RegistryState;
};

function registryState(): RegistryState {
  const globalRegistry = globalThis as GlobalWithRegistry;

  if (!globalRegistry[REGISTRY_SYMBOL]) {
    globalRegistry[REGISTRY_SYMBOL] = {
      providers: new Map(),
      capabilities: new Map(),
    };
  }

  return globalRegistry[REGISTRY_SYMBOL];
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function validateUrl(value: string, fieldName: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
    url.hostname,
  );

  if (url.protocol !== "https:" && !isLocalHost) {
    throw new Error(`${fieldName} must use HTTPS outside localhost`);
  }

  return url.toString();
}

function validateAddress(value: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("pay_to must be a 20-byte EVM address");
  }

  return value as Address;
}

function validateArchitecture(
  value: CapabilityRegistrationRequest["architecture"],
): MarketplaceArchitecture {
  if (!value || !ARCHITECTURES.has(value)) {
    throw new Error(
      "architecture must be direct-tool-rental, agent-as-a-service, or capability-leasing",
    );
  }

  return value;
}

function validatePriceBase(value: string | undefined) {
  if (!value?.trim()) {
    throw new Error("price.base is required");
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("price.base must be a positive decimal USDC amount");
  }

  return parsed.toFixed(2);
}

function validateMarketplaceFeeBps(value: number | undefined) {
  const feeBps = value ?? 0;

  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new Error(
      "price.marketplace_fee_bps must be an integer from 0 to 10000",
    );
  }

  return feeBps;
}

function publicProvider(record: ProviderRecord): RegisteredProvider {
  const { tokenHash: _tokenHash, ...provider } = record;
  return provider;
}

function hasStaticCapability(capabilityId: string) {
  return STATIC_MARKETPLACE_CAPABILITIES.some(
    (capability) => capability.id === capabilityId,
  );
}

export function listProviders(): RegisteredProvider[] {
  return [...registryState().providers.values()].map(publicProvider);
}

export function getProvider(providerId: string): RegisteredProvider | undefined {
  const provider = registryState().providers.get(providerId);

  return provider ? publicProvider(provider) : undefined;
}

export function registerProvider(
  request: ProviderRegistrationRequest,
): ProviderRegistrationResponse {
  const providerId = normalizeId(request.provider_id || request.name || "");

  if (!providerId) {
    throw new Error("provider_id or name is required");
  }

  if (!request.name?.trim()) {
    throw new Error("name is required");
  }

  if (!request.endpoint_url?.trim()) {
    throw new Error("endpoint_url is required");
  }

  const state = registryState();

  if (state.providers.has(providerId)) {
    throw new Error(`Provider already exists: ${providerId}`);
  }

  const providerToken = randomToken();
  const now = new Date().toISOString();
  const provider: ProviderRecord = {
    id: providerId,
    name: request.name.trim(),
    endpoint_url: validateUrl(request.endpoint_url, "endpoint_url"),
    pay_to: validateAddress(request.pay_to ?? ""),
    contact: request.contact,
    status: "active",
    created_at: now,
    tokenHash: tokenHash(providerToken),
  };

  state.providers.set(provider.id, provider);

  return {
    provider: publicProvider(provider),
    provider_token: providerToken,
    routes: {
      add_capability: `/api/providers/${provider.id}/capabilities`,
      list_capabilities: `/api/providers/${provider.id}/capabilities`,
    },
  };
}

export function assertProviderToken(providerId: string, token: string) {
  const provider = registryState().providers.get(providerId);

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  if (!token || tokenHash(token) !== provider.tokenHash) {
    throw new Error("Invalid provider token");
  }

  return provider;
}

export function listCapabilities(): Capability[] {
  return [
    ...STATIC_MARKETPLACE_CAPABILITIES,
    ...registryState().capabilities.values(),
  ];
}

export function getCapability(capabilityId: string): Capability | undefined {
  return (
    STATIC_MARKETPLACE_CAPABILITIES.find(
      (capability) => capability.id === capabilityId,
    ) ?? registryState().capabilities.get(capabilityId)
  );
}

export function listProviderCapabilities(providerId: string): Capability[] {
  return [...registryState().capabilities.values()].filter(
    (capability) => capability.provider.id === providerId,
  );
}

export function registerProviderCapability({
  providerId,
  providerToken,
  request,
}: {
  providerId: string;
  providerToken: string;
  request: CapabilityRegistrationRequest;
}): Capability {
  const provider = assertProviderToken(providerId, providerToken);
  const localCapabilityId = normalizeId(request.id || request.name || "");

  if (!localCapabilityId) {
    throw new Error("capability id or name is required");
  }

  const capabilityId = `${provider.id}:${localCapabilityId}`;

  if (
    hasStaticCapability(capabilityId) ||
    registryState().capabilities.has(capabilityId)
  ) {
    throw new Error(`Capability id is reserved: ${capabilityId}`);
  }

  if (!request.name?.trim()) {
    throw new Error("name is required");
  }

  if (!request.summary?.trim()) {
    throw new Error("summary is required");
  }

  if (!Array.isArray(request.capabilities) || !request.capabilities.length) {
    throw new Error("capabilities must include at least one item");
  }

  if (!request.input_schema || typeof request.input_schema !== "object") {
    throw new Error("input_schema is required");
  }

  if (!request.output_schema || typeof request.output_schema !== "object") {
    throw new Error("output_schema is required");
  }

  const marketplaceFeeBps = validateMarketplaceFeeBps(
    request.price?.marketplace_fee_bps,
  );

  const capability: Capability = {
    id: capabilityId,
    name: request.name.trim(),
    architecture: validateArchitecture(request.architecture),
    provider: {
      id: provider.id,
      name: provider.name,
    },
    summary: request.summary.trim(),
    capabilities: request.capabilities.map((capabilityName) =>
      normalizeId(capabilityName),
    ),
    inputSchema: request.input_schema,
    outputSchema: request.output_schema,
    price: {
      base: validatePriceBase(request.price?.base),
      currency: "USDC",
      settlementAsset: "monad-testnet-usdc",
      marketplaceFeeBps,
      providerPayoutBps: 10_000 - marketplaceFeeBps,
    },
    seller: {
      mode: "provider",
      endpoint_url: provider.endpoint_url,
      pay_to: provider.pay_to,
      registered_at: new Date().toISOString(),
    },
  };

  registryState().capabilities.set(capability.id, capability);

  return capability;
}
