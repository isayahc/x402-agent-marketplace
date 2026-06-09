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
      "/api/providers/{providerId}/agent-card": {
        get: {
          operationId: "getProviderAgentCard",
          summary: "Get the marketplace-generated A2A Agent Card for a provider.",
          parameters: [
            {
              name: "providerId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "A2A Agent Card" },
            "404": { description: "Unknown provider" },
          },
        },
      },
      "/.well-known/agent-card.json": {
        get: {
          operationId: "getMarketplaceAgentCard",
          summary: "Get the marketplace A2A Agent Card.",
          responses: {
            "200": { description: "Marketplace A2A Agent Card" },
          },
        },
      },
      "/api/a2a/message:send": {
        post: {
          operationId: "routePaidA2AMessage",
          summary:
            "Route a paid A2A message/send task to a seller agent endpoint.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PaidA2ASendMessageRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "A2A routed task and interface run" },
            "400": { description: "Invalid token, quote, or A2A request" },
          },
        },
      },
      "/api/a2a/tasks/{taskId}": {
        get: {
          operationId: "getA2ATask",
          summary: "Get the marketplace-tracked A2A task by id.",
          parameters: [
            {
              name: "taskId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "A2A task" },
            "404": { description: "Unknown task" },
          },
        },
      },
      "/api/a2a/runs": {
        get: {
          operationId: "listA2AInterfaceRuns",
          summary: "List marketplace-tracked A2A interface runs.",
          responses: {
            "200": { description: "A2A interface runs" },
          },
        },
      },
      "/api/a2a/runs/{runId}": {
        get: {
          operationId: "getA2AInterfaceRun",
          summary: "Get one marketplace-tracked A2A interface run.",
          parameters: [
            {
              name: "runId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "A2A interface run" },
            "404": { description: "Unknown interface run" },
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
            a2a_endpoint_url: { type: "string", format: "uri" },
            agent_card_url: { type: "string", format: "uri" },
            a2a_protocol_binding: {
              type: "string",
              enum: ["JSONRPC", "HTTP+JSON"],
              default: "JSONRPC",
            },
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
        PaidA2ASendMessageRequest: {
          type: "object",
          required: ["execution_token", "message"],
          properties: {
            quote_id: { type: "string" },
            execution_token: { type: "string" },
            message: { $ref: "#/components/schemas/A2AMessage" },
            configuration: { type: "object" },
            metadata: { type: "object" },
          },
        },
        A2AMessage: {
          type: "object",
          required: ["kind", "messageId", "role", "parts"],
          properties: {
            kind: { const: "message" },
            messageId: { type: "string" },
            role: { type: "string", enum: ["user", "agent"] },
            parts: {
              type: "array",
              items: { $ref: "#/components/schemas/A2APart" },
            },
            taskId: { type: "string" },
            contextId: { type: "string" },
            metadata: { type: "object" },
          },
        },
        A2APart: {
          oneOf: [
            {
              type: "object",
              required: ["kind", "text"],
              properties: {
                kind: { const: "text" },
                text: { type: "string" },
                metadata: { type: "object" },
              },
            },
            {
              type: "object",
              required: ["kind", "data"],
              properties: {
                kind: { const: "data" },
                data: { type: "object" },
                metadata: { type: "object" },
              },
            },
          ],
        },
      },
    },
  };
}
