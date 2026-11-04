import { verifyMessage, type Address, type Hex } from "viem";

const MAX_AGE_MS = 10 * 60_000;

/** Pesan yang ditandatangani creator untuk membuktikan dia pemilik wallet. */
export function createAgentMessage(p: { name: string; ticker: string; issuedAt: string }) {
  return `Zoplr: create agent "${p.name}" (${p.ticker})\nIssued at: ${p.issuedAt}`;
}

export async function verifyCreatorSignature(p: {
  address: Address;
  name: string;
  ticker: string;
  issuedAt: string;
  signature: Hex;
}): Promise<boolean> {
  const issued = Date.parse(p.issuedAt);
  if (Number.isNaN(issued) || Math.abs(Date.now() - issued) > MAX_AGE_MS) return false;
  try {
    return await verifyMessage({
      address: p.address,
      message: createAgentMessage(p),
      signature: p.signature,
    });
  } catch {
    // Signature yang formatnya rusak membuat viem melempar error.
    return false;
  }
}
