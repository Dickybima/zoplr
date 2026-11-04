import {
  decodeEventLog,
  type Address,
  type Hash,
  type Log,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { ponsV2FactoryAbi } from "./abi";

export interface LaunchParams {
  name: string;
  ticker: string;
  /** URL metadata agent (JSON: deskripsi, gambar, link halaman Zoplr). */
  metadataURI: string;
  /** ETH yang dikirim saat launch (initial buy / fee), dalam wei. */
  value?: bigint;
}

export interface LaunchedToken {
  token: Address;
  creator: Address;
  name: string;
  symbol: string;
  txHash: Hash;
}

/** Argumen untuk `createToken` di factory. Sesuaikan jika ABI resmi berbeda. */
export function encodeLaunchArgs(p: LaunchParams) {
  return [p.name, p.ticker, p.metadataURI] as const;
}

/** Request kontrak yang bisa langsung dipakai wagmi `writeContract` / viem. */
export function buildLaunchRequest(factoryAddress: Address, p: LaunchParams) {
  return {
    address: factoryAddress,
    abi: ponsV2FactoryAbi,
    functionName: "createToken" as const,
    args: encodeLaunchArgs(p),
    value: p.value ?? 0n,
  };
}

/**
 * Simulasikan launch sebelum user tanda tangan. Melempar error jika
 * transaksi akan revert — jadi user tidak buang gas.
 */
export async function simulateLaunch(
  client: PublicClient,
  factoryAddress: Address,
  account: Address,
  p: LaunchParams,
) {
  const { result, request } = await client.simulateContract({
    ...buildLaunchRequest(factoryAddress, p),
    account,
  });
  return { predictedToken: result, request };
}

/** Ambil data token baru dari satu log event factory (atau null jika bukan event launch). */
export function parseLaunchEvent(log: Log): Omit<LaunchedToken, "txHash"> | null {
  try {
    const decoded = decodeEventLog({ abi: ponsV2FactoryAbi, data: log.data, topics: log.topics });
    if (decoded.eventName !== "TokenCreated") return null;
    return decoded.args;
  } catch {
    return null;
  }
}

/** Cari token yang dibuat di dalam receipt transaksi launch. */
export function findLaunchInReceipt(
  receipt: TransactionReceipt,
  factoryAddress: Address,
): LaunchedToken | null {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
    const parsed = parseLaunchEvent(log);
    if (parsed) return { ...parsed, txHash: receipt.transactionHash };
  }
  return null;
}
