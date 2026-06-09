import { jsonResponse, optionsResponse } from "@/lib/http";
import { listA2AInterfaceRuns } from "@/lib/marketplace/a2a";

export async function GET() {
  return jsonResponse(listA2AInterfaceRuns());
}

export function OPTIONS() {
  return optionsResponse();
}
