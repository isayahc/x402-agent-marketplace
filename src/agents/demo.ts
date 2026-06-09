import "../lib/load-env";

import {
  createAgentLogger,
  createRunId,
  getAgentLogFile,
} from "../lib/agent-logs";
import { runBuyerAgent } from "./buyer-agent";
import { runSellerAgent } from "./seller-agent";

async function main() {
  const runId = createRunId("marketplace-demo");
  const log = createAgentLogger(runId);

  await log("agent-demo", "started", "Starting seller and buyer agent demo.");

  try {
    const seller = await runSellerAgent({ runId, log });
    const buyer = await runBuyerAgent({
      runId,
      log,
      preferredCapabilityId: seller.capability.id,
    });

    await log("agent-demo", "completed", "Completed seller and buyer agent demo.", {
      sellerCapabilityId: seller.capability.id,
      buyerSelectedCapabilityId: buyer.selected?.id,
      quoteId: buyer.quote?.quote_id,
      paid: Boolean(buyer.execution),
    });

    console.log("Agent demo complete");
    console.log(
      JSON.stringify(
        {
          runId,
          seller: {
            provider: seller.registration.provider,
            capability: seller.capability,
          },
          buyer: {
            selected: buyer.selected,
            quote: buyer.quote
              ? {
                  capability_id: buyer.quote.capability_id,
                  cost: buyer.quote.cost,
                  currency: buyer.quote.currency,
                  pay_to: buyer.quote.pay_to,
                  payment_receiver: buyer.quote.payment_receiver,
                }
              : undefined,
            paid: Boolean(buyer.execution),
            settlementTx: buyer.settlementTx,
          },
          logs: getAgentLogFile(),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await log("agent-demo", "failed", "Agent demo failed.", {
      error: message,
    });

    throw error;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
