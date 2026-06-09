import "dotenv/config";

import { x402Client } from "@x402/core/client";
import type { SettleResponse } from "@x402/core/types";
import { decodePaymentResponseHeader, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme, type ClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

import {
  DEFAULT_MONAD_RPC_URL,
  DEFAULT_PROVIDER_URL,
  envPrivateKey,
  envString,
  explorerTxUrl,
  MONAD_CHAIN_ID,
  MONAD_NETWORK,
} from "./lib/x402-config";
import type {
  CapabilitySearchResult,
  ExecuteResponse,
  PayResponse,
  QuoteResponse,
} from "./lib/marketplace/types";

export type ToolResult = {
  tool: string;
  status: "completed";
  result: Record<string, unknown>;
  completedAt: string;
};

export type MarketplaceToolRequest = {
  query?: string;
  capabilityId?: string;
  arguments?: Record<string, unknown>;
};

type SignTypedDataParameters = Parameters<
  ReturnType<typeof privateKeyToAccount>["signTypedData"]
>[0];

function buildPaymentFetch() {
  const account = privateKeyToAccount(envPrivateKey("AGENT_PRIVATE_KEY"));

  const signer: ClientEvmSigner = {
    address: account.address,
    signTypedData: async (message) => {
      return account.signTypedData({
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
      } as SignTypedDataParameters);
    },
  };

  const exactScheme = new ExactEvmScheme(signer, {
    [MONAD_CHAIN_ID]: {
      rpcUrl: envString("MONAD_RPC_URL", DEFAULT_MONAD_RPC_URL),
    },
  });
  const client = new x402Client().register(MONAD_NETWORK, exactScheme);

  return wrapFetchWithPayment(fetch, client);
}

function getProviderUrl() {
  return envString("PROVIDER_URL", DEFAULT_PROVIDER_URL).replace(/\/+$/, "");
}

function decodeSettlement(response: Response): SettleResponse | null {
  const header =
    response.headers.get("PAYMENT-RESPONSE") ??
    response.headers.get("X-PAYMENT-RESPONSE");

  if (!header) {
    return null;
  }

  return decodePaymentResponseHeader(header);
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  const paymentRequired = response.headers.get("payment-required");
  const details = [body, paymentRequired].filter(Boolean).join("\n");

  if (/insufficient|balance|fund/i.test(details)) {
    return [
      "Insufficient funds for the x402 payment.",
      "Fund AGENT_PRIVATE_KEY with Monad testnet USDC and keep a little MON for normal wallet activity.",
      details,
    ].join("\n");
  }

  if (/nonce|validAfter|validBefore|expired|clock|authorization/i.test(details)) {
    return [
      "Payment authorization was rejected, likely due to clock skew or nonce validity.",
      "Check the machine clock and retry so the x402 client can produce a fresh authorization.",
      details,
    ].join("\n");
  }

  return details || `HTTP ${response.status} ${response.statusText}`;
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}

async function postJson<T>(
  url: URL,
  body: Record<string, unknown>,
  requestFetch: typeof fetch = fetch,
): Promise<{
  data: T;
  response: Response;
}> {
  const response = await requestFetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    data: await readJsonOrThrow<T>(response),
    response,
  };
}

export async function searchTools(query: string): Promise<CapabilitySearchResult[]> {
  const url = new URL("/api/search", getProviderUrl());
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  return readJsonOrThrow<CapabilitySearchResult[]>(response);
}

export async function requestCapability({
  query = "sec filing analysis",
  capabilityId,
  arguments: args = {
    company: "Example Corp",
    filing_url: "https://example.com/10k.pdf",
    focus: "financial risks",
    constraints: { max_words: 500 },
  },
}: MarketplaceToolRequest = {}): Promise<{
  result: ExecuteResponse;
  settlement: SettleResponse | null;
}> {
  const providerUrl = getProviderUrl();
  const selectedCapabilityId =
    capabilityId ?? (await searchTools(query))[0]?.id ?? "sec-analyzer";

  const quoteUrl = new URL("/api/quote", providerUrl);
  const { data: quote } = await postJson<QuoteResponse>(quoteUrl, {
    capability_id: selectedCapabilityId,
    arguments: args,
  });

  const paymentFetch = buildPaymentFetch();
  const payUrl = new URL("/api/pay", providerUrl);
  payUrl.searchParams.set("quote_id", quote.quote_id);

  const { data: paid, response: payResponse } = await postJson<PayResponse>(
    payUrl,
    {},
    paymentFetch,
  );

  const executeUrl = new URL(paid.execute.endpoint, providerUrl);
  const { data: result } = await postJson<ExecuteResponse>(executeUrl, {
    quote_id: quote.quote_id,
    execution_token: paid.execution_token,
    arguments: args,
  });

  return {
    result,
    settlement: decodeSettlement(payResponse),
  };
}

async function callTool(input?: Record<string, unknown>) {
  const paymentFetch = buildPaymentFetch();
  const url = new URL("/api/tool", getProviderUrl());

  if (input) {
    url.searchParams.set("input", JSON.stringify(input));
  }

  const response = await paymentFetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as ToolResult;

  return {
    result: data,
    settlement: decodeSettlement(response),
  };
}

export async function getToolResult(input?: Record<string, unknown>): Promise<ToolResult> {
  const { result } = await callTool(input);
  return result;
}

async function main() {
  const capabilityId = process.env.CAPABILITY_ID?.trim() || "sec-analyzer";
  const { result, settlement } = await requestCapability({ capabilityId });
  const txHash = settlement?.transaction;

  console.log("Marketplace result:");
  console.log(JSON.stringify(result, null, 2));

  if (txHash) {
    console.log(`Settlement tx: ${txHash}`);
    console.log(`Explorer: ${explorerTxUrl(txHash)}`);
  } else {
    console.log("Settlement tx: not found in payment response headers");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
