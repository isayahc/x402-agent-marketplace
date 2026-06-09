import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getBaseUrl, getMarketplaceManifest } from "@/lib/marketplace/manifest";

export function GET(request: NextRequest) {
  return jsonResponse(getMarketplaceManifest(getBaseUrl(request)));
}

export function OPTIONS() {
  return optionsResponse();
}
