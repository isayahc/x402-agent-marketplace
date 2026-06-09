Agent_Buyer;
Agent_Seller;
Tool_Provider;

Agent_Buyer -> searches for apropiate tools. If the cost to run the tool is fair to the
agent then the agent buy the right to use the tool. The Agent feeds it's context to the
to the tool.

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

The execute step accepts a narrow task packet rather than the buyer agent's full context.
