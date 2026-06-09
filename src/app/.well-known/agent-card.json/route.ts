import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getBaseUrl } from "@/lib/marketplace/manifest";
import { getMarketplaceAgentCard } from "@/lib/marketplace/registry";

export function GET(request: NextRequest) {
  return jsonResponse(getMarketplaceAgentCard(getBaseUrl(request)));
}

export function OPTIONS() {
  return optionsResponse();
}
