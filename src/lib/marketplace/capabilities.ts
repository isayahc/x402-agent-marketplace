import type { Capability } from "./types";

export const MARKETPLACE_CAPABILITIES = [
  {
    id: "ocr-basic",
    name: "OCR Basic",
    architecture: "direct-tool-rental",
    provider: {
      id: "deterministic-tools",
      name: "Deterministic Tools Co.",
    },
    summary: "Extract text from an image URL with a stable raw-tool interface.",
    capabilities: ["ocr", "image_text_extraction"],
    inputSchema: {
      type: "object",
      required: ["image_url"],
      properties: {
        image_url: { type: "string", format: "uri" },
      },
    },
    outputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string" },
      },
    },
    price: {
      base: "0.01",
      currency: "USDC",
      settlementAsset: "monad-testnet-usdc",
      marketplaceFeeBps: 1000,
      providerPayoutBps: 9000,
    },
  },
  {
    id: "lead-research-agent",
    name: "Lead Research Agent",
    architecture: "agent-as-a-service",
    provider: {
      id: "research-swarm",
      name: "Research Swarm",
    },
    summary: "Hire a provider agent to research and summarize target accounts.",
    capabilities: ["lead_generation", "company_research", "ranking"],
    inputSchema: {
      type: "object",
      required: ["market", "geography"],
      properties: {
        market: { type: "string" },
        geography: { type: "string" },
        stage: { type: "string" },
      },
    },
    outputSchema: {
      type: "object",
      required: ["companies", "reasoning_summary"],
      properties: {
        companies: { type: "array" },
        reasoning_summary: { type: "string" },
      },
    },
    price: {
      base: "0.05",
      currency: "USDC",
      settlementAsset: "monad-testnet-usdc",
      marketplaceFeeBps: 1000,
      providerPayoutBps: 9000,
    },
  },
  {
    id: "sec-analyzer",
    name: "SEC Filing Analyst",
    architecture: "capability-leasing",
    provider: {
      id: "filing-intel",
      name: "Filing Intel",
    },
    summary:
      "Lease a structured SEC analysis capability while sending only a narrow task packet.",
    capabilities: ["analyze_10k", "extract_risks"],
    inputSchema: {
      type: "object",
      required: ["company", "filing_url"],
      properties: {
        company: { type: "string" },
        filing_url: { type: "string", format: "uri" },
        focus: { type: "string" },
        constraints: {
          type: "object",
          properties: {
            max_words: { type: "number" },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      required: ["risks", "reasoning_summary"],
      properties: {
        risks: { type: "array" },
        reasoning_summary: { type: "string" },
      },
    },
    price: {
      base: "0.05",
      currency: "USDC",
      settlementAsset: "monad-testnet-usdc",
      marketplaceFeeBps: 1000,
      providerPayoutBps: 9000,
    },
  },
] as const satisfies Capability[];

export function listCapabilities(): Capability[] {
  return [...MARKETPLACE_CAPABILITIES];
}

export function getCapability(capabilityId: string): Capability | undefined {
  return MARKETPLACE_CAPABILITIES.find(
    (capability) => capability.id === capabilityId,
  );
}
