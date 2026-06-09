"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function formatAddress(address?: string) {
  if (!address) {
    return "Not linked";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PrivySignup() {
  if (!privyAppId) {
    return (
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">User access</p>
          <h2>Privy is not configured</h2>
          <p className="muted">
            Add <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to <code>.env.local</code>{" "}
            to enable signup.
          </p>
        </div>
      </section>
    );
  }

  return <PrivySignupInner />;
}

function PrivySignupInner() {
  const { ready, authenticated, user, login, logout, linkEmail, linkWallet } =
    usePrivy();

  const linkedMethods = useMemo(() => {
    if (!user) {
      return [];
    }

    return Array.from(new Set(user.linkedAccounts.map((account) => account.type)));
  }, [user]);

  if (!ready) {
    return (
      <section className="panel auth-panel">
        <p className="eyebrow">User access</p>
        <h2>Preparing signup</h2>
        <div className="skeleton" aria-hidden="true" />
      </section>
    );
  }

  if (!authenticated || !user) {
    return (
      <section className="panel auth-panel">
        <div>
          <p className="eyebrow">User access</p>
          <h2>Create an account</h2>
          <p className="muted">
            Sign up with email, Google, or an EVM wallet before browsing paid
            providers.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={login}>
          Sign up with Privy
        </button>
      </section>
    );
  }

  return (
    <section className="panel auth-panel">
      <div className="auth-header">
        <div>
          <p className="eyebrow">Signed in</p>
          <h2>Marketplace account</h2>
        </div>
        <button className="secondary-button" type="button" onClick={logout}>
          Sign out
        </button>
      </div>

      <dl className="account-grid">
        <div>
          <dt>Privy DID</dt>
          <dd>{user.id}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email?.address ?? "Not linked"}</dd>
        </div>
        <div>
          <dt>Wallet</dt>
          <dd>{formatAddress(user.wallet?.address)}</dd>
        </div>
        <div>
          <dt>Linked methods</dt>
          <dd>{linkedMethods.length ? linkedMethods.join(", ") : "None"}</dd>
        </div>
      </dl>

      <div className="button-row">
        {!user.email && (
          <button className="secondary-button" type="button" onClick={linkEmail}>
            Link email
          </button>
        )}
        {!user.wallet && (
          <button className="secondary-button" type="button" onClick={linkWallet}>
            Link wallet
          </button>
        )}
      </div>
    </section>
  );
}
