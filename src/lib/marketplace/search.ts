import { listCapabilities } from "./capabilities";
import type {
  Capability,
  CapabilitySearchRequest,
  CapabilitySearchResult,
} from "./types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesToken(value: string, token: string) {
  return normalize(value).includes(normalize(token));
}

function capabilitySearchText(capability: Capability) {
  return {
    id: capability.id,
    name: capability.name,
    architecture: capability.architecture,
    provider: `${capability.provider.id} ${capability.provider.name}`,
    summary: capability.summary,
    capabilities: capability.capabilities.join(" "),
  };
}

function scoreCapability(capability: Capability, query: string) {
  const fields = capabilitySearchText(capability);
  const tokens = normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return {
      score: 1,
      fields: ["all"],
    };
  }

  let score = 0;
  const matchedFields = new Set<string>();

  for (const token of tokens) {
    for (const [field, value] of Object.entries(fields)) {
      if (!includesToken(value, token)) {
        continue;
      }

      matchedFields.add(field);
      score += field === "id" || field === "name" ? 3 : 1;
    }
  }

  return {
    score,
    fields: [...matchedFields],
  };
}

function belowMaxPrice(capability: Capability, maxPrice?: string) {
  if (!maxPrice) {
    return true;
  }

  const parsed = Number.parseFloat(maxPrice.replace(/^\$/, ""));

  if (!Number.isFinite(parsed)) {
    return true;
  }

  return Number.parseFloat(capability.price.base) <= parsed;
}

export function searchCapabilities(
  request: CapabilitySearchRequest,
): CapabilitySearchResult[] {
  return listCapabilities()
    .filter((capability) => {
      if (
        request.architecture &&
        capability.architecture !== request.architecture
      ) {
        return false;
      }

      if (
        request.capability &&
        !capability.capabilities.some((name) =>
          includesToken(name, request.capability ?? ""),
        )
      ) {
        return false;
      }

      return belowMaxPrice(capability, request.max_price);
    })
    .map((capability) => ({
      ...capability,
      match: scoreCapability(capability, request.query ?? ""),
    }))
    .filter((capability) => capability.match.score > 0)
    .sort((left, right) => right.match.score - left.match.score);
}
