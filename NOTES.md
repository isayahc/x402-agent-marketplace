Agent_Buyer;
Agent_Seller;
Tool_Provider;

Agent_Buyer -> searches for appropriate tools. If the cost to run the tool is fair to the
agent then the agent buys the right to use the tool. The agent sends a narrow task packet
to the tool.

Agent_Seller -> registers a provider endpoint, publishes one or more capabilities with
schemas and prices, and receives x402 settlement at its own pay_to address.

Simple agent demo:

- `npm run agents` runs a seller agent, then a buyer agent.
- Seller publishes a service through `POST /api/providers/register` and
  `POST /api/providers/:providerId/capabilities`.
- Buyer searches, selects the seller capability, and quotes it.
- `AGENTS_PAY=true` lets the buyer pay and route an A2A `message/send` task through x402.
- Agent events are appended to `logs/agent-runs.jsonl`.

x402-paid A2A task routing:

- Seller agents register an A2A endpoint and Agent Card URL.
- Buyer pays a capability quote and receives an execution token.
- Marketplace accepts `POST /api/a2a/message:send` with the execution token.
- Marketplace tracks interface runs, task ids, forwarded request payloads, seller responses, and status.

Implemented TypeScript prototype:

- Direct tool rental: `ocr-basic`
- Agent-as-a-service: `lead-research-agent`
- Capability leasing: `sec-analyzer`

Routes:

- `GET /llms.txt`
- `GET /.well-known/agent-marketplace.json`
- `GET /.well-known/agent-card.json`
- `GET /openapi.json`
- `GET /api/search`
- `GET /api/capabilities`
- `POST /api/quote`
- paid `POST /api/pay?quote_id=<quote_id>`
- `POST /api/execute`
- `GET /api/providers`
- `POST /api/providers/register`
- `GET /api/providers/:providerId/agent-card`
- `GET /api/providers/:providerId/capabilities`
- `POST /api/providers/:providerId/capabilities`
- `POST /api/a2a/message:send`
- `GET /api/a2a/tasks/:taskId`
- `GET /api/a2a/runs`
- `GET /api/a2a/runs/:runId`
- `GET /api/mock-provider/agent-card`
- `POST /api/mock-provider/a2a`
- `POST /api/mock-provider`

The execute step accepts a narrow task packet rather than the buyer agent's full context.
Registered provider execution forwards the paid task packet to the provider endpoint.
The A2A route is the protocol-shaped path; `/api/execute` remains as the older direct marketplace executor.
Provider registration is in-memory in this hackathon prototype.
