# x402 Agent Marketplace

Hackathon-grade x402 pay-per-call tool provider and autonomous Node agent for Monad testnet.

## What Is Included

- `GET /api/tool`: a protected Next.js App Router route using `withX402`, `x402ResourceServer`, `HTTPFacilitatorClient`, and `ExactEvmScheme`.
- Capability marketplace prototype: `GET /api/capabilities`, `POST /api/quote`, paid `POST /api/pay`, and `POST /api/execute`.
- Seller-agent API: `POST /api/providers/register` and `POST /api/providers/{provider_id}/capabilities` let agents publish their own paid tool capabilities.
- `npm run agent`: a TypeScript Node script that signs x402 payments with `AGENT_PRIVATE_KEY`, calls the provider, prints the structured result, and links the settlement transaction.
- `npm run seller`: a TypeScript Node script that registers a demo seller agent and publishes a capability over plain HTTP.
- `npm run agents`: a two-agent demo with one seller agent publishing a service and one buyer agent searching/quoting it, with JSONL logs.
- Privy signup on the home page using `@privy-io/react-auth`.
- Shared Monad/x402 constants in `src/lib/x402-config.ts`.

The facilitator preflight was checked against `GET https://x402-facilitator.molandak.org/supported`; it lists `network: "eip155:10143"` with `scheme: "exact"` and `x402Version: 2`.

## Install

Node 18.18 or newer is required. The current `@x402/next` v2 package declares a Next 16 peer range, but this repo pins Next 15 to keep the hackathon app Node 18-compatible; `.npmrc` enables npm's legacy peer resolver for that adapter metadata.

```bash
npm install
cp .env.example .env.local
cp .env.example .env
```

Use `.env.local` for the Next provider. Node scripts load `.env.local` first and then `.env`, so your local `OPENAI_API_KEY` is available to the demo agents without copying it into `.env`.

## Environment

```bash
PAY_TO_ADDRESS=0xYourPayToAddress
AGENT_PRIVATE_KEY=0xYourAgentPrivateKey
PROVIDER_URL=http://localhost:3000
CAPABILITY_ID=sec-analyzer
TOOL_PRICE=\$0.01
MARKETPLACE_SIGNING_SECRET=replace-with-a-long-random-string
FACILITATOR_URL=https://x402-facilitator.molandak.org
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PRIVY_CLIENT_ID=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
AGENT_LOG_FILE=logs/agent-runs.jsonl
AGENTS_PAY=false
BUYER_SERVICE_GOAL=Find a low-cost service that returns structured compliance output.
SELLER_SERVICE_GOAL=Sell a small compliance and risk snapshot service.
SELLER_PROVIDER_ID=
SELLER_NAME=Demo Seller Agent
SELLER_ENDPOINT_URL=http://localhost:3000/api/mock-provider
SELLER_A2A_ENDPOINT_URL=http://localhost:3000/api/mock-provider/a2a
SELLER_AGENT_CARD_URL=http://localhost:3000/api/mock-provider/agent-card
SELLER_PAY_TO_ADDRESS=
SELLER_CONTACT=
SELLER_CAPABILITY_ID=demo-analysis
SELLER_CAPABILITY_NAME=Demo Analysis Agent
SELLER_PRICE=0.02
SELLER_MARKETPLACE_FEE_BPS=0
```

Never commit real keys. `PAY_TO_ADDRESS` receives USDC. `AGENT_PRIVATE_KEY` pays for tool calls. `MARKETPLACE_SIGNING_SECRET` signs stateless quote and execution tokens. Keep the backslash before `$` in env files so Next loads the price as `$0.01`; or omit `TOOL_PRICE` to use the same default. `NEXT_PUBLIC_PRIVY_APP_ID` comes from the Privy dashboard and is safe for the browser; do not expose Privy app secrets in `NEXT_PUBLIC_*` variables.

## Privy Signup

1. Create a Privy app in the Privy dashboard.
2. Enable the login methods you want to use, such as email, wallet, and Google.
3. Put the app id in `.env.local` as `NEXT_PUBLIC_PRIVY_APP_ID`.
4. Restart `npm run dev`.

The home page will show a signup button when Privy is configured, then an account summary after login.

## Framework-Neutral Agent Access

Any agent framework can use the marketplace over plain HTTP. No LangChain, CrewAI, Autogen, MCP, or browser wallet dependency is required.

Discovery documents:

```bash
curl http://localhost:3000/llms.txt
curl http://localhost:3000/.well-known/agent-marketplace.json
curl http://localhost:3000/openapi.json
```

Search:

```bash
curl 'http://localhost:3000/api/search?q=sec%20risk&max_price=0.05'
```

All public discovery and execution routes return JSON and include permissive CORS headers for browser-hosted agents. The paid step is still x402: agents that can handle HTTP 402 payment requirements can buy access through `POST /api/pay?quote_id=<quote_id>`.

## Seller-Agent API

Seller agents can publish capabilities without a dashboard or browser wallet. Registration is currently in-memory for hackathon use, so restart clears registered providers.

Register a provider:

```bash
curl -X POST http://localhost:3000/api/providers/register \
  -H 'content-type: application/json' \
  -d '{
	    "provider_id": "demo-seller",
	    "name": "Demo Seller Agent",
	    "endpoint_url": "http://localhost:3000/api/mock-provider",
	    "a2a_endpoint_url": "http://localhost:3000/api/mock-provider/a2a",
	    "agent_card_url": "http://localhost:3000/api/mock-provider/agent-card",
	    "a2a_protocol_binding": "JSONRPC",
	    "pay_to": "0xYourProviderPayoutAddress"
	  }'
```

The response includes a `provider_token`. Keep it secret. Publish a capability:

```bash
curl -X POST http://localhost:3000/api/providers/demo-seller/capabilities \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <provider_token>' \
  -d '{
    "id": "demo-analysis",
    "name": "Demo Analysis Agent",
    "architecture": "agent-as-a-service",
    "summary": "Accepts a paid task packet and returns structured JSON.",
    "capabilities": ["demo_analysis", "structured_output"],
    "input_schema": { "type": "object", "properties": { "prompt": { "type": "string" } } },
    "output_schema": { "type": "object", "properties": { "summary": { "type": "string" } } },
    "price": { "base": "0.02", "marketplace_fee_bps": 0 }
  }'
```

The new capability appears in `/api/search` and `/api/capabilities`. Quotes for registered seller capabilities set `pay_to` to the seller's payout address, and the x402 `/api/pay` requirement uses that same signed address. The current prototype does not auto-split marketplace fees; x402 settlement is single-recipient here, so use `marketplace_fee_bps: 0` unless you add a payout ledger or split-settlement contract.

You can run the same flow from TypeScript:

```bash
npm run seller
```

## Marketplace Flow

The prototype supports all three marketplace shapes in TypeScript:

- Direct tool rental: deterministic services such as OCR.
- Agent-as-a-service: a provider agent orchestrates its own workflow.
- Capability leasing: the provider advertises schemas and capabilities, while the buyer sends a narrow task packet.

Discover or search capabilities:

```bash
curl http://localhost:3000/api/capabilities
curl 'http://localhost:3000/api/search?q=ocr'
```

Create a quote:

```bash
curl -X POST http://localhost:3000/api/quote \
  -H 'content-type: application/json' \
  -d '{"capability_id":"sec-analyzer"}'
```

Pay the quote with x402:

```bash
curl -i -X POST 'http://localhost:3000/api/pay?quote_id=<quote_id>'
```

An autonomous x402 client should call the same URL through `wrapFetchWithPayment`. After settlement, `/api/pay` returns an `execution_token`.

Route a paid A2A task:

```bash
curl -X POST http://localhost:3000/api/a2a/message:send \
  -H 'content-type: application/json' \
  -d '{
    "quote_id": "<quote_id>",
    "execution_token": "<execution_token>",
    "message": {
      "kind": "message",
      "messageId": "buyer-msg-1",
      "role": "user",
      "parts": [
        {
          "kind": "data",
          "data": {
            "prompt": "Review this vendor onboarding note."
          }
        }
      ]
    }
  }'
```

The marketplace verifies the token, forwards the message to the seller's A2A endpoint, and stores an interface run that can be inspected with `GET /api/a2a/runs/<run_id>`. The marketplace Agent Card is available at `/.well-known/agent-card.json`; provider cards are available at `/api/providers/<provider_id>/agent-card`.

Execute the capability with a task packet:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H 'content-type: application/json' \
  -d '{
    "quote_id": "<quote_id>",
    "execution_token": "<execution_token>",
    "arguments": {
      "company": "Example Corp",
      "filing_url": "https://example.com/10k.pdf",
      "focus": "financial risks",
      "constraints": { "max_words": 500 }
    }
  }'
```

There is no database. Quotes and execution tokens are signed, time-limited tokens, so the buyer does not need to send its full conversation history or internal reasoning to the provider.

## Testnet Funds

Get testnet USDC from the Circle faucet:

1. Open `https://faucet.circle.com`.
2. Select `USDC`.
3. Select `Monad Testnet`.
4. Enter the agent wallet address.
5. Send 1 USDC.

You may also want MON for normal testnet wallet activity. Use the Monad faucet at `https://faucet.monad.xyz`.

## Run The Provider

```bash
npm run dev
```

Without payment, the provider should return HTTP 402 plus x402 requirements:

```bash
curl -i http://localhost:3000/api/tool
```

## Run Two Simple Agents

With the dev server running, start the seller-plus-buyer demo:

```bash
npm run agents
tail -n 20 logs/agent-runs.jsonl
```

The seller agent creates a simple service listing and publishes it through the provider API. The buyer agent creates a search plan, searches `/api/search`, selects the seller's capability, and creates a quote. By default it stops before payment so the demo works without funded testnet USDC.

The quote step requires `MARKETPLACE_SIGNING_SECRET` in the server environment. When `AGENTS_PAY` is false, the seller demo can use a dummy `pay_to` address if `SELLER_PAY_TO_ADDRESS` or `PAY_TO_ADDRESS` is still a placeholder. When `AGENTS_PAY=true`, set a real seller payout address.

Set `AGENTS_PAY=true` to make the buyer pay and execute through the existing x402 flow:

```bash
AGENTS_PAY=true npm run agents
```

The demo uses `OPENAI_API_KEY` and `OPENAI_MODEL` when available to draft the seller listing and buyer search plan. If OpenAI is not configured or the request fails, both agents use deterministic fallback plans and still write logs.

## Run A Seller Agent

With the dev server running:

```bash
npm run seller
curl 'http://localhost:3000/api/search?q=demo'
```

The script registers a provider, publishes a capability, and prints the provider token plus the published capability id. The default endpoint is the local demo provider at `/api/mock-provider`.

## Run The Agent

In another terminal:

```bash
npm run agent
```

The agent builds a viem account from `AGENT_PRIVATE_KEY`, adapts it to the x402 EVM signer shape, registers `ExactEvmScheme` for `eip155:10143`, and calls the provider through `wrapFetchWithPayment`. A successful run prints the structured tool result and a Monad explorer link for the settlement transaction.

By default, `npm run agent` now requests the capability in `CAPABILITY_ID`, creates a quote, pays `POST /api/pay?quote_id=...`, and executes with the returned `execution_token`. Re-running `npm run agent` creates a fresh x402 authorization each time.

## Verify

```bash
npm run typecheck
npm run build
```
