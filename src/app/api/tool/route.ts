import { NextResponse, type NextRequest } from "next/server";
import { withX402, type RouteConfig } from "@x402/next";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

import {
  DEFAULT_FACILITATOR_URL,
  DEFAULT_TOOL_PRICE,
  DEFAULT_USDC_ADDRESS,
  envAddress,
  envString,
  MONAD_NETWORK,
  USDC_DECIMALS,
  USDC_EIP712_EXTRA,
  X402_SCHEME,
} from "@/lib/x402-config";

const payTo = envAddress("PAY_TO_ADDRESS");
const facilitatorUrl = envString("FACILITATOR_URL", DEFAULT_FACILITATOR_URL);
const usdcAddress = envAddress("USDC_ADDRESS", DEFAULT_USDC_ADDRESS);
const toolPrice = envString("TOOL_PRICE", DEFAULT_TOOL_PRICE);

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitatorClient);

const monadScheme = new ExactEvmScheme();

monadScheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network !== MONAD_NETWORK) {
    return null;
  }

  return {
    amount: Math.floor(amount * 10 ** USDC_DECIMALS).toString(),
    asset: usdcAddress,
    extra: USDC_EIP712_EXTRA,
  };
});

server.register(MONAD_NETWORK, monadScheme);

const routeConfig: RouteConfig = {
  accepts: {
    scheme: X402_SCHEME,
    network: MONAD_NETWORK,
    payTo,
    price: toolPrice,
  },
  resource: "/api/tool",
};

async function handler(_request: NextRequest) {
  return NextResponse.json({
    tool: "compliance-check",
    status: "completed",
    result: {
      decision: "approved",
      riskScore: 0.07,
      checks: [
        {
          id: "sanctions-screen",
          status: "passed",
          summary: "No sanctioned-party indicators found in the mock review.",
        },
        {
          id: "policy-fit",
          status: "passed",
          summary: "Request fits the hackathon marketplace policy profile.",
        },
      ],
    },
    completedAt: new Date().toISOString(),
  });
}

export const GET = withX402(handler, routeConfig, server);
