import { getMarketplaceManifest } from "./manifest";
import { listCapabilities } from "./registry";

export function getOpenApiSpec(baseUrl: string) {
  const manifest = getMarketplaceManifest(baseUrl);

  return {
    openapi: "3.1.0",
    info: {
      title: manifest.name,
      version: manifest.version,
      description: manifest.description,
    },
    servers: [{ url: baseUrl.replace(/\/+$/, "") }],
    "x-agent-marketplace": manifest,
    paths: {
      "/api/manifest": {
        get: {
          operationId: "getMarketplaceManifest",
          summary: "Get machine-readable marketplace metadata.",
          responses: {
            "200": { description: "Marketplace manifest" },
          },
        },
      },
      "/api/search": {
        get: {
          operationId: "searchCapabilities",
          summary: "Search marketplace capabilities.",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            {
              name: "architecture",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "direct-tool-rental",
                  "agent-as-a-service",
                  "capability-leasing",
                ],
              },
            },
            { name: "capability", in: "query", schema: { type: "string" } },
            { name: "max_price", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Search results" },
          },
        },
        post: {
          operationId: "searchCapabilitiesPost",
          summary: "Search marketplace capabilities with a JSON body.",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CapabilitySearchRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Search results" },
          },
        },
      },
      "/api/capabilities": {
        get: {
          operationId: "listCapabilities",
          summary: "List all advertised capabilities.",
          responses: {
            "200": { description: "Capability list" },
          },
        },
      },
      "/api/quote": {
        post: {
          operationId: "createQuote",
          summary: "Create a signed, time-limited quote for a capability.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuoteRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Quote" },
            "400": { description: "Invalid quote request" },
          },
        },
      },
      "/api/pay": {
        post: {
          operationId: "payQuote",
          summary:
            "Pay a quote with x402. Unpaid requests return HTTP 402 payment requirements.",
          parameters: [
            {
              name: "quote_id",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Execution token after x402 settlement" },
            "402": { description: "x402 payment required" },
          },
        },
      },
      "/api/execute": {
        post: {
          operationId: "executeCapability",
          summary: "Execute a paid capability with a narrow task packet.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExecuteRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Structured capability result" },
            "400": { description: "Invalid execution request" },
          },
        },
      },
      "/api/providers": {
        get: {
          operationId: "listProviders",
          summary: "List registered seller agents and tool providers.",
          responses: {
            "200": { description: "Registered providers" },
          },
        },
      },
      "/api/providers/register": {
        post: {
          operationId: "registerProvider",
          summary: "Register a seller agent/provider endpoint.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProviderRegistrationRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Provider registration with provider token" },
            "400": { description: "Invalid provider registration" },
          },
        },
      },
      "/api/providers/{providerId}/capabilities": {
        get: {
          operationId: "listProviderCapabilities",
          summary: "List capabilities published by one provider.",
          parameters: [
            {
              name: "providerId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Provider capabilities" },
          },
        },
        post: {
          operationId: "publishProviderCapability",
          summary:
            "Publish a seller capability. Requires Authorization: Bearer <provider_token>.",
          parameters: [
            {
              name: "providerId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CapabilityRegistrationRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Published capability" },
            "401": { description: "Invalid provider token" },
            "400": { description: "Invalid capability registration" },
          },
        },
      },
    },
    components: {
      schemas: {
        CapabilitySearchRequest: {
          type: "object",
          properties: {
            query: { type: "string" },
            architecture: {
              type: "string",
              enum: [
                "direct-tool-rental",
                "agent-as-a-service",
                "capability-leasing",
              ],
            },
            capability: { type: "string" },
            max_price: { type: "string" },
          },
        },
        QuoteRequest: {
          type: "object",
          required: ["capability_id"],
          properties: {
            capability_id: {
              type: "string",
              enum: listCapabilities().map((capability) => capability.id),
            },
            arguments: { type: "object" },
          },
        },
        ExecuteRequest: {
          type: "object",
          required: ["execution_token"],
          properties: {
            quote_id: { type: "string" },
            execution_token: { type: "string" },
            arguments: { type: "object" },
          },
        },
        ProviderRegistrationRequest: {
          type: "object",
          required: ["name", "endpoint_url", "pay_to"],
          properties: {
            provider_id: { type: "string" },
            name: { type: "string" },
            endpoint_url: { type: "string", format: "uri" },
            pay_to: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
            contact: { type: "string" },
          },
        },
        CapabilityRegistrationRequest: {
          type: "object",
          required: [
            "name",
            "architecture",
            "summary",
            "capabilities",
            "input_schema",
            "output_schema",
            "price",
          ],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            architecture: {
              type: "string",
              enum: [
                "direct-tool-rental",
                "agent-as-a-service",
                "capability-leasing",
              ],
            },
            summary: { type: "string" },
            capabilities: {
              type: "array",
              items: { type: "string" },
            },
            input_schema: { type: "object" },
            output_schema: { type: "object" },
            price: {
              type: "object",
              required: ["base"],
              properties: {
                base: { type: "string", example: "0.03" },
                marketplace_fee_bps: {
                  type: "integer",
                  minimum: 0,
                  maximum: 10000,
                  default: 0,
                },
              },
            },
          },
        },
      },
    },
  };
}
