import type { HTTPRequestContext, RouteConfig } from "@x402/core/server";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import type { Price } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";

import {
  DEFAULT_FACILITATOR_URL,
  DEFAULT_TOOL_PRICE,
  DEFAULT_USDC_ADDRESS,
  envAddress,
  envString,
  MONAD_NETWORK,
  USDC_EIP712_EXTRA,
  usdToAtomicUnits,
  X402_SCHEME,
} from "./x402-config";

type PaymentPrice =
  | Price
  | ((context: HTTPRequestContext) => Price | Promise<Price>);
type PaymentPayTo =
  | string
  | ((context: HTTPRequestContext) => string | Promise<string>);

export function createMonadX402Server() {
  const facilitatorUrl = envString("FACILITATOR_URL", DEFAULT_FACILITATOR_URL);
  const usdcAddress = envAddress("USDC_ADDRESS", DEFAULT_USDC_ADDRESS);

  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const server = new x402ResourceServer(facilitatorClient);
  const monadScheme = new ExactEvmScheme();

  monadScheme.registerMoneyParser(async (amount, network) => {
    if (network !== MONAD_NETWORK) {
      return null;
    }

    return {
      amount: usdToAtomicUnits(amount),
      asset: usdcAddress,
      extra: USDC_EIP712_EXTRA,
    };
  });

  server.register(MONAD_NETWORK, monadScheme);

  return server;
}

export function createMonadRouteConfig({
  price = envString("TOOL_PRICE", DEFAULT_TOOL_PRICE),
  payTo = envAddress("PAY_TO_ADDRESS"),
  resource,
  description,
  unpaidResponseBody,
}: {
  price?: PaymentPrice;
  payTo?: PaymentPayTo;
  resource: string;
  description?: string;
  unpaidResponseBody?: RouteConfig["unpaidResponseBody"];
}): RouteConfig {
  return {
    accepts: {
      scheme: X402_SCHEME,
      network: MONAD_NETWORK,
      payTo,
      price,
    },
    resource,
    description,
    unpaidResponseBody,
  };
}
