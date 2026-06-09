import { NextResponse } from "next/server";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type,accept,authorization,a2a-version,a2a-extensions,payment-signature,x-payment,x-provider-token",
  "Access-Control-Expose-Headers":
    "payment-required,payment-response,x-payment-response",
};

export function jsonResponse<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...init?.headers,
    },
  });
}

export function optionsResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
