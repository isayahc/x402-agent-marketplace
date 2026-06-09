"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Privy pulls in WalletConnect, which touches `localStorage` at import time.
// Loading it with ssr:false keeps that out of the server render.
const PrivyAuthProvider = dynamic(() => import("./privy-provider"), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}
