# x402 Agent Marketplace

Hackathon-grade x402 pay-per-call tool provider and autonomous Node agent for Monad testnet.

## What Is Included

- `GET /api/tool`: a protected Next.js App Router route using `withX402`, `x402ResourceServer`, `HTTPFacilitatorClient`, and `ExactEvmScheme`.
- `npm run agent`: a TypeScript Node script that signs x402 payments with `AGENT_PRIVATE_KEY`, calls the provider, prints the structured result, and links the settlement transaction.
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

Use `.env.local` for the Next provider and `.env` for the agent script.

## Environment

```bash
PAY_TO_ADDRESS=0xYourPayToAddress
AGENT_PRIVATE_KEY=0xYourAgentPrivateKey
PROVIDER_URL=http://localhost:3000
TOOL_PRICE=\$0.01
FACILITATOR_URL=https://x402-facilitator.molandak.org
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PRIVY_CLIENT_ID=
```

Never commit real keys. `PAY_TO_ADDRESS` receives USDC. `AGENT_PRIVATE_KEY` pays for tool calls. Keep the backslash before `$` in env files so Next loads the price as `$0.01`; or omit `TOOL_PRICE` to use the same default. `NEXT_PUBLIC_PRIVY_APP_ID` comes from the Privy dashboard and is safe for the browser; do not expose Privy app secrets in `NEXT_PUBLIC_*` variables.

## Privy Signup

1. Create a Privy app in the Privy dashboard.
2. Enable the login methods you want to use, such as email, wallet, and Google.
3. Put the app id in `.env.local` as `NEXT_PUBLIC_PRIVY_APP_ID`.
4. Restart `npm run dev`.

The home page will show a signup button when Privy is configured, then an account summary after login.

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

## Run The Agent

In another terminal:

```bash
npm run agent
```

The agent builds a viem account from `AGENT_PRIVATE_KEY`, adapts it to the x402 EVM signer shape, registers `ExactEvmScheme` for `eip155:10143`, and calls the provider through `wrapFetchWithPayment`. A successful run prints the structured tool result and a Monad explorer link for the settlement transaction.

Re-running `npm run agent` creates a fresh x402 authorization each time.

## Verify

```bash
npm run typecheck
npm run build
```
