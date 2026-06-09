import { PrivySignup } from "@/components/privy-signup";

export default function Home() {
  return (
    <main>
      <section className="page-heading">
        <p className="eyebrow">Monad testnet</p>
        <h1>x402 Agent Marketplace</h1>
      </section>

      <PrivySignup />

      <section className="panel tool-panel">
        <div>
          <p className="eyebrow">Provider</p>
          <h2>Pay-per-call endpoint</h2>
        </div>
        <code>/api/tool</code>
      </section>
    </main>
  );
}
