"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export default function PrivyAuthProvider({ children }: { children: ReactNode }) {
  if (!privyAppId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId || undefined}
      config={{
        loginMethods: ["email", "wallet", "google"],
        appearance: {
          theme: "light",
          accentColor: "#2563eb",
          landingHeader: "Create your marketplace account",
          loginMessage: "Sign in to manage marketplace access.",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
