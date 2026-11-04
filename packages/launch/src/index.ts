/**
 * Verifikasi launch agent di Pons V2 — dipakai bersama oleh:
 *  - web (Vercel): dijalankan saat halaman agent dibuka/di-refresh, jadi
 *    TIDAK butuh proses worker terpisah di serverless;
 *  - worker (opsional): polling terus-menerus untuk hosting non-serverless.
 */
import { createPublicClient, http, TransactionReceiptNotFoundError, type Hash } from "viem";
import { agents, and, eq, getDb, type Agent } from "@zoplr/db";
import { findLaunchInReceipt, loadPonsConfig, type PonsConfig } from "@zoplr/pons";

/** Tx yang tidak ditemukan setelah selama ini dianggap gagal (mis. di-drop dari mempool). */
const STALE_MS = Number(process.env.LAUNCH_STALE_MS ?? 15 * 60_000);

let cached: { config: PonsConfig; client: ReturnType<typeof createPublicClient> } | undefined;

function getChain() {
  if (!cached) {
    const config = loadPonsConfig();
    cached = { config, client: createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) }) };
  }
  return cached;
}

export type VerifyResult = "pending" | "live" | "failed" | "skipped";

/**
 * Cek satu agent berstatus `launching`. Aman dipanggil berulang/bersamaan:
 * update hanya berlaku jika status masih `launching`.
 */
export async function verifyLaunch(agent: Agent): Promise<VerifyResult> {
  if (agent.status !== "launching" || !agent.launchTxHash) return "skipped";
  const { config, client } = getChain();

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
      return "failed";
    }
    return "pending";
  }
  if (receipt.status !== "success") {
    await markFailed(agent.id, "Transaksi launch revert");
    return "failed";
  }

  const launched = findLaunchInReceipt(receipt, config.factoryAddress);
  if (!launched) {
    await markFailed(agent.id, "Event launch Pons tidak ditemukan di receipt");
    return "failed";
  }
  if (launched.creator.toLowerCase() !== agent.creatorAddress.toLowerCase()) {
    await markFailed(agent.id, "Creator token tidak cocok dengan pembuat agent");
    return "failed";
  }

  await getDb()
    .update(agents)
    .set({ status: "live", tokenAddress: launched.token.toLowerCase(), updatedAt: new Date() })
    .where(and(eq(agents.id, agent.id), eq(agents.status, "launching")));
  return "live";
}

/** Verifikasi semua agent yang sedang `launching` (dipakai worker). */
export async function verifyAllLaunching(): Promise<void> {
  const pending = await getDb().select().from(agents).where(eq(agents.status, "launching"));
  for (const agent of pending) {
    try {
      const result = await verifyLaunch(agent);
      if (result !== "pending") console.log(`[${result}] ${agent.slug}`);
    } catch (err) {
      console.error(`[error] ${agent.slug}:`, err);
    }
  }
}

async function markFailed(id: string, reason: string) {
  await getDb()
    .update(agents)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(and(eq(agents.id, id), eq(agents.status, "launching")));
}
