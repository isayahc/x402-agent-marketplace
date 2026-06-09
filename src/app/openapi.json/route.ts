import { type NextRequest } from "next/server";

import { jsonResponse, optionsResponse } from "@/lib/http";
import { getBaseUrl } from "@/lib/marketplace/manifest";
import { getOpenApiSpec } from "@/lib/marketplace/openapi";

export function GET(request: NextRequest) {
  return jsonResponse(getOpenApiSpec(getBaseUrl(request)));
}

export function OPTIONS() {
  return optionsResponse();
}
