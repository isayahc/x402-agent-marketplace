Agent_Buyer;
Agent_Seller;
Tool_Provider;

Agent_Buyer -> searches for appropriate tools. If the cost to run the tool is fair to the
agent then the agent buys the right to use the tool. The agent sends a narrow task packet
to the tool.

Agent_Seller -> registers a provider endpoint, publishes one or more capabilities with
schemas and prices, and receives x402 settlement at its own pay_to address.

Implemented TypeScript prototype:

- Direct tool rental: `ocr-basic`
- Agent-as-a-service: `lead-research-agent`
- Capability leasing: `sec-analyzer`

Routes:

- `GET /llms.txt`
- `GET /.well-known/agent-marketplace.json`
- `GET /openapi.json`
- `GET /api/search`
- `GET /api/capabilities`
- `POST /api/quote`
- paid `POST /api/pay?quote_id=<quote_id>`
- `POST /api/execute`
- `GET /api/providers`
- `POST /api/providers/register`
- `GET /api/providers/:providerId/capabilities`
- `POST /api/providers/:providerId/capabilities`
- `POST /api/mock-provider`

The execute step accepts a narrow task packet rather than the buyer agent's full context.
Registered provider execution forwards the paid task packet to the provider endpoint.
Provider registration is in-memory in this hackathon prototype.
