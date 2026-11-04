/**
 * Zoplr worker — "auto deploy" agent setelah token-nya di-launch di Pons V2.
 *
 * Alur:
 *  1. Web menyimpan agent sebagai `launching` + tx hash setelah user tanda tangan.
 *  2. Worker menunggu receipt tx tersebut, mencari event launch dari factory,
 *     lalu menandai agent `live` dengan alamat token-nya.
 *  3. Agent `live` langsung bisa dipakai chat di halaman agent.
 */
import { createPublicClient, http, TransactionReceiptNotFoundError, type Hash } from "viem";
import { agents, eq, getDb } from "@zoplr/db";
import { findLaunchInReceipt, loadPonsConfig } from "@zoplr/pons";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 4000);
/** Tx yang tidak ditemukan setelah selama ini dianggap gagal (mis. di-drop dari mempool). */
const STALE_MS = Number(process.env.WORKER_STALE_MS ?? 15 * 60_000);

const config = loadPonsConfig();
const client = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
const db = getDb();

async function processLaunching() {
  const pending = await db.select().from(agents).where(eq(agents.status, "launching"));

  for (const agent of pending) {
    if (!agent.launchTxHash) continue;
    try {
      // Hanya "receipt belum ada" yang dianggap pending; error RPC lain dilempar
      // supaya agent tidak salah ditandai gagal saat RPC sedang down.
      const receipt = await client
        .getTransactionReceipt({ hash: agent.launchTxHash as Hash })
        .catch((err) => {
          if (err instanceof TransactionReceiptNotFoundError) return null;
          throw err;
        });

      if (!receipt) {
        if (Date.now() - agent.updatedAt.getTime() > STALE_MS) {
          await markFailed(agent.id, "Transaksi tidak ditemukan (timeout)");
        }
        continue;
      }

      if (receipt.status !== "success") {
        await markFailed(agent.id, "Transaksi launch revert");
        continue;
      }

      const launched = findLaunchInReceipt(receipt, config.factoryAddress);
      if (!launched) {
        await markFailed(agent.id, "Event launch Pons tidak ditemukan di receipt");
        continue;
      }
      if (launched.creator.toLowerCase() !== agent.creatorAddress.toLowerCase()) {
        await markFailed(agent.id, "Creator token tidak cocok dengan pembuat agent");
        continue;
      }

      await db
        .update(agents)
        .set({ status: "live", tokenAddress: launched.token.toLowerCase(), updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
      console.log(`[live] ${agent.slug} → token ${launched.token}`);
    } catch (err) {
      console.error(`[error] ${agent.slug}:`, err);
    }
  }
}

async function markFailed(id: string, reason: string) {
  await db
    .update(agents)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(eq(agents.id, id));
  console.warn(`[failed] ${id}: ${reason}`);
}

async function main() {
  console.log(`Zoplr worker jalan — mode=${config.mode} rpc=${config.rpcUrl}`);
  for (;;) {
    await processLaunching();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
