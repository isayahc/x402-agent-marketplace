import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { envString } from "@/lib/x402-config";

import { getCapability } from "./capabilities";
import type {
  ExecutionTokenPayload,
  QuotePayload,
  QuoteResponse,
} from "./types";

const QUOTE_TTL_MS = 10 * 60 * 1000;
const EXECUTION_TOKEN_TTL_MS = 10 * 60 * 1000;

type SignedEnvelope<T> = {
  payload: T;
  signature: string;
};

function signingSecret() {
  return envString("MARKETPLACE_SIGNING_SECRET");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: unknown) {
  return createHmac("sha256", signingSecret())
    .update(JSON.stringify(payload))
    .digest("base64url");
}

function createToken<T>(payload: T) {
  const envelope: SignedEnvelope<T> = {
    payload,
    signature: signPayload(payload),
  };

  return encodeBase64Url(JSON.stringify(envelope));
}

function verifyToken<T>(token: string): T {
  let envelope: SignedEnvelope<T>;

  try {
    envelope = JSON.parse(decodeBase64Url(token)) as SignedEnvelope<T>;
  } catch {
    throw new Error("Malformed signed token");
  }

  if (!envelope.payload || !envelope.signature) {
    throw new Error("Malformed signed token");
  }

  const expected = signPayload(envelope.payload);
  const actualBuffer = Buffer.from(envelope.signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid signed token");
  }

  return envelope.payload;
}

function assertNotExpired(expiresAt: string) {
  if (Date.parse(expiresAt) <= Date.now()) {
    throw new Error("Signed token has expired");
  }
}

function formatUsd(value: number) {
  return value.toFixed(2);
}

function splitFee(base: string, marketplaceFeeBps: number) {
  const amount = Number.parseFloat(base);
  const marketplaceFee = amount * (marketplaceFeeBps / 10_000);
  const providerPayout = amount - marketplaceFee;

  return {
    marketplaceFee: formatUsd(marketplaceFee),
    providerPayout: formatUsd(providerPayout),
  };
}

export function createQuote(capabilityId: string): QuoteResponse {
  const capability = getCapability(capabilityId);

  if (!capability) {
    throw new Error(`Unknown capability: ${capabilityId}`);
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + QUOTE_TTL_MS);
  const { marketplaceFee, providerPayout } = splitFee(
    capability.price.base,
    capability.price.marketplaceFeeBps,
  );

  const unsignedQuote: Omit<QuotePayload, "quote_id"> = {
    capability_id: capability.id,
    x402_price: `$${capability.price.base}`,
    cost: capability.price.base,
    currency: capability.price.currency,
    marketplace_fee: marketplaceFee,
    provider_payout: providerPayout,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const quoteId = createToken({
    token_type: "quote",
    quote_nonce: randomUUID(),
    ...unsignedQuote,
  });

  return {
    quote_id: quoteId,
    ...unsignedQuote,
    payment: {
      method: "POST",
      endpoint: "/api/pay",
      query: {
        quote_id: quoteId,
      },
    },
  };
}

export function verifyQuote(quoteId: string): QuotePayload {
  const payload = verifyToken<
    Omit<QuotePayload, "quote_id"> & {
      token_type: string;
      quote_nonce: string;
    }
  >(quoteId);

  if (payload.token_type !== "quote") {
    throw new Error("Signed token is not a quote");
  }

  assertNotExpired(payload.expires_at);

  return {
    quote_id: quoteId,
    capability_id: payload.capability_id,
    x402_price: payload.x402_price,
    cost: payload.cost,
    currency: payload.currency,
    marketplace_fee: payload.marketplace_fee,
    provider_payout: payload.provider_payout,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
  };
}

export function createExecutionToken(quote: QuotePayload): string {
  const paidAt = new Date();
  const expiresAt = new Date(paidAt.getTime() + EXECUTION_TOKEN_TTL_MS);

  return createToken<ExecutionTokenPayload & { token_type: string }>({
    token_type: "execution",
    token_id: randomUUID(),
    quote_id: quote.quote_id,
    capability_id: quote.capability_id,
    paid_at: paidAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
}

export function verifyExecutionToken(token: string): ExecutionTokenPayload {
  const payload = verifyToken<ExecutionTokenPayload & { token_type: string }>(
    token,
  );

  if (payload.token_type !== "execution") {
    throw new Error("Signed token is not an execution token");
  }

  assertNotExpired(payload.expires_at);

  return {
    token_id: payload.token_id,
    quote_id: payload.quote_id,
    capability_id: payload.capability_id,
    paid_at: payload.paid_at,
    expires_at: payload.expires_at,
  };
}
