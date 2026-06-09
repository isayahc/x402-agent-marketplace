import type { Address } from "viem";

export type MarketplaceArchitecture =
  | "direct-tool-rental"
  | "agent-as-a-service"
  | "capability-leasing";

export type JsonSchema = Record<string, unknown>;

export type CapabilityPrice = {
  base: string;
  currency: "USDC";
  settlementAsset: "monad-testnet-usdc";
  marketplaceFeeBps: number;
  providerPayoutBps: number;
};

export type Capability = {
  id: string;
  name: string;
  architecture: MarketplaceArchitecture;
  provider: {
    id: string;
    name: string;
  };
  summary: string;
  capabilities: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  price: CapabilityPrice;
  seller?: {
    mode: "static" | "provider";
    endpoint_url?: string;
    pay_to?: Address;
    registered_at?: string;
  };
};

export type RegisteredProvider = {
  id: string;
  name: string;
  endpoint_url: string;
  pay_to: Address;
  contact?: string;
  status: "active";
  created_at: string;
};

export type ProviderRegistrationRequest = {
  provider_id?: string;
  name?: string;
  endpoint_url?: string;
  pay_to?: string;
  contact?: string;
};

export type ProviderRegistrationResponse = {
  provider: RegisteredProvider;
  provider_token: string;
  routes: {
    add_capability: string;
    list_capabilities: string;
  };
};

export type CapabilityRegistrationRequest = {
  id?: string;
  name?: string;
  architecture?: MarketplaceArchitecture;
  summary?: string;
  capabilities?: string[];
  input_schema?: JsonSchema;
  output_schema?: JsonSchema;
  price?: {
    base?: string;
    marketplace_fee_bps?: number;
  };
};

export type CapabilitySearchRequest = {
  query?: string;
  architecture?: MarketplaceArchitecture;
  capability?: string;
  max_price?: string;
};

export type CapabilitySearchMatch = {
  score: number;
  fields: string[];
};

export type CapabilitySearchResult = Capability & {
  match: CapabilitySearchMatch;
};

export type MarketplaceManifest = {
  name: string;
  description: string;
  version: string;
  protocol: {
    payment: "x402";
    x402Version: 2;
    scheme: "exact";
    network: "eip155:10143";
    settlementAsset: "monad-testnet-usdc";
  };
  agentInterfaces: {
    manifest: string;
    openapi: string;
    llms: string;
    search: string;
    capabilities: string;
    quote: string;
    pay: string;
    execute: string;
    providers: string;
    provider_registration: string;
    provider_capabilities: string;
  };
  flow: string[];
};

export type QuoteRequest = {
  capability_id?: string;
  arguments?: Record<string, unknown>;
};

export type QuotePayload = {
  quote_id: string;
  capability_id: string;
  x402_price: string;
  cost: string;
  currency: "USDC";
  pay_to: Address;
  payment_receiver: "marketplace" | "provider";
  marketplace_fee: string;
  provider_payout: string;
  issued_at: string;
  expires_at: string;
};

export type QuoteResponse = QuotePayload & {
  payment: {
    method: "POST";
    endpoint: "/api/pay";
    query: {
      quote_id: string;
    };
  };
};

export type ExecutionTokenPayload = {
  token_id: string;
  quote_id: string;
  capability_id: string;
  paid_at: string;
  expires_at: string;
};

export type PayResponse = {
  status: "paid";
  quote_id: string;
  capability_id: string;
  execution_token: string;
  execute: {
    method: "POST";
    endpoint: "/api/execute";
  };
};

export type ExecuteRequest = {
  quote_id?: string;
  execution_token?: string;
  arguments?: Record<string, unknown>;
};

export type ExecuteResponse = {
  status: "success";
  quote_id: string;
  capability_id: string;
  architecture: MarketplaceArchitecture;
  result: Record<string, unknown>;
  completed_at: string;
};
