import type { Network } from "@x402/core/types";
import type { Address, Hex } from "viem";

export const MONAD_NETWORK = "eip155:10143" as const satisfies Network;
export const MONAD_CHAIN_ID = 10143;
export const X402_SCHEME = "exact" as const;
export const USDC_DECIMALS = 6;

export const DEFAULT_FACILITATOR_URL = "https://x402-facilitator.molandak.org";
export const DEFAULT_PROVIDER_URL = "http://localhost:3000";
export const DEFAULT_TOOL_PRICE = "$0.01";
export const DEFAULT_MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";
export const DEFAULT_USDC_ADDRESS =
  "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const satisfies Address;
export const MONAD_EXPLORER_TX_URL = "https://testnet.monadexplorer.com/tx";

export const USDC_EIP712_EXTRA = {
  name: "USDC",
  version: "2",
} as const;

export function envString(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`${name} environment variable is required`);
}

export function envAddress(name: string, fallback?: Address): Address {
  const value = envString(name, fallback);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} must be a 20-byte EVM address`);
  }
  return value as Address;
}

export function envPrivateKey(name: string): Hex {
  const value = envString(name);
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte hex private key`);
  }
  return value as Hex;
}

export function explorerTxUrl(txHash: string): string {
  return `${MONAD_EXPLORER_TX_URL}/${txHash}`;
}

export function usdToAtomicUnits(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Payment amount must be a positive finite number");
  }

  const [whole, fraction = ""] = amount.toFixed(USDC_DECIMALS).split(".");
  const paddedFraction = fraction.padEnd(USDC_DECIMALS, "0");

  return (
    BigInt(whole) * BigInt(10 ** USDC_DECIMALS) +
    BigInt(paddedFraction)
  ).toString();
}
