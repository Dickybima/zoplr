import type { Address } from "viem";
import { robinhoodChain, type ChainMode } from "@zoplr/pons";

/** Konfigurasi publik (aman untuk browser). */
export const chainMode = (process.env.NEXT_PUBLIC_ZOPLR_CHAIN_MODE ?? "fork") as ChainMode;
export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
export const chainId = Number(process.env.NEXT_PUBLIC_PONS_CHAIN_ID || 31337);
export const factoryAddress = (process.env.NEXT_PUBLIC_PONS_FACTORY_ADDRESS ?? "") as Address;
export const chain = robinhoodChain(chainId, rpcUrl, chainMode);

const allowlist = (process.env.NEXT_PUBLIC_LAUNCH_ALLOWLIST ?? "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

/** Saat soft-launch mainnet, hanya wallet di allowlist yang boleh launch. */
export function canLaunch(address?: string): boolean {
  if (!address) return false;
  return allowlist.length === 0 || allowlist.includes(address.toLowerCase());
}
