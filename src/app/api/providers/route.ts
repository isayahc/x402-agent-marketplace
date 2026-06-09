import { jsonResponse, optionsResponse } from "@/lib/http";
import { listProviders } from "@/lib/marketplace/registry";

export async function GET() {
  return jsonResponse(listProviders());
}

export function OPTIONS() {
  return optionsResponse();
}
