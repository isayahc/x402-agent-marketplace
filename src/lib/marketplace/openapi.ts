import { listCapabilities } from "./capabilities";
import { getMarketplaceManifest } from "./manifest";

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
      },
    },
  };
}
