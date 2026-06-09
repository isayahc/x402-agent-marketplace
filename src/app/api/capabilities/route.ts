import { jsonResponse, optionsResponse } from "@/lib/http";
import { listCapabilities } from "@/lib/marketplace/capabilities";

export async function GET() {
  return jsonResponse(listCapabilities());
}

export function OPTIONS() {
  return optionsResponse();
}
