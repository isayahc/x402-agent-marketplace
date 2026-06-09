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
    a2a_endpoint_url?: string;
    agent_card_url?: string;
    a2a_protocol_binding?: "JSONRPC" | "HTTP+JSON";
    pay_to?: Address;
    registered_at?: string;
  };
};

export type RegisteredProvider = {
  id: string;
  name: string;
  endpoint_url: string;
  a2a_endpoint_url?: string;
  agent_card_url?: string;
  a2a_protocol_binding?: "JSONRPC" | "HTTP+JSON";
  pay_to: Address;
  contact?: string;
  status: "active";
  created_at: string;
};

export type ProviderRegistrationRequest = {
  provider_id?: string;
  name?: string;
  endpoint_url?: string;
  a2a_endpoint_url?: string;
  agent_card_url?: string;
  a2a_protocol_binding?: "JSONRPC" | "HTTP+JSON";
  pay_to?: string;
  contact?: string;
};

export type ProviderRegistrationResponse = {
  provider: RegisteredProvider;
  provider_token: string;
  routes: {
    add_capability: string;
    list_capabilities: string;
    agent_card: string;
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
    a2a_message_send: string;
    a2a_task: string;
    a2a_runs: string;
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

export type A2AProtocolBinding = "JSONRPC" | "HTTP+JSON";

export type A2AAgentSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  inputModes?: string[];
  outputModes?: string[];
};

export type A2AAgentCard = {
  protocolVersion: string;
  name: string;
  description: string;
  url: string;
  preferredTransport: A2AProtocolBinding;
  version: string;
  provider?: {
    organization: string;
    url?: string;
  };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
    extensions?: Array<{
      uri: string;
      description: string;
      required: boolean;
      params?: Record<string, unknown>;
    }>;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
  securitySchemes?: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
};

export type A2ARole = "user" | "agent";

export type A2APart =
  | {
      kind: "text";
      text: string;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "data";
      data: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };

export type A2AMessage = {
  kind: "message";
  messageId: string;
  role: A2ARole;
  parts: A2APart[];
  taskId?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
};

export type A2ATaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "canceled"
  | "failed"
  | "rejected"
  | "auth-required";

export type A2ATaskStatus = {
  state: A2ATaskState;
  message?: A2AMessage;
  timestamp?: string;
};

export type A2AArtifact = {
  artifactId: string;
  name?: string;
  parts: A2APart[];
  metadata?: Record<string, unknown>;
};

export type A2ATask = {
  kind: "task";
  id: string;
  contextId?: string;
  status: A2ATaskStatus;
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
  metadata?: Record<string, unknown>;
};

export type A2ASendMessageRequest = {
  message: A2AMessage;
  configuration?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type A2ASendMessageResponse = {
  task?: A2ATask;
  message?: A2AMessage;
};

export type PaidA2ASendMessageRequest = A2ASendMessageRequest & {
  quote_id?: string;
  execution_token?: string;
};

export type A2AInterfaceRunEvent = {
  timestamp: string;
  event: string;
  message: string;
  data?: Record<string, unknown>;
};

export type A2AInterfaceRun = {
  id: string;
  task_id: string;
  status: A2ATaskState;
  quote_id: string;
  capability_id: string;
  provider_id: string;
  seller_endpoint_url: string;
  protocol_binding: A2AProtocolBinding;
  request: A2ASendMessageRequest;
  response?: A2ASendMessageResponse;
  remote_task_id?: string;
  error?: string;
  events: A2AInterfaceRunEvent[];
  created_at: string;
  updated_at: string;
};
