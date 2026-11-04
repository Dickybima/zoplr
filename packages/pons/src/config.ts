import { defineChain, type Address, type Chain } from "viem";

export type ChainMode = "fork" | "mainnet";

export interface PonsConfig {
  mode: ChainMode;
  chain: Chain;
  rpcUrl: string;
  factoryAddress: Address;
  factoryStartBlock: bigint;
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Env ${key} wajib diisi (lihat .env.example)`);
  return value;
}

/**
 * Bangun konfigurasi dari env. Di mode `fork`, chain ID tetap sama dengan
 * mainnet (Anvil dijalankan dengan --chain-id yang sama), hanya RPC yang
 * diarahkan ke Anvil lokal — jadi alamat kontrak identik dengan produksi.
 */
export function loadPonsConfig(env: Env = process.env): PonsConfig {
  const mode = (env.ZOPLR_CHAIN_MODE ?? "fork") as ChainMode;
  if (mode !== "fork" && mode !== "mainnet") {
    throw new Error(`ZOPLR_CHAIN_MODE tidak dikenal: ${mode}`);
  }
  const rpcUrl =
    mode === "fork"
      ? env.FORK_RPC_URL ?? "http://127.0.0.1:8545"
      : required(env, "MAINNET_RPC_URL");
  const chainId = Number(required(env, "PONS_CHAIN_ID"));
  const factoryAddress = required(env, "PONS_FACTORY_ADDRESS") as Address;

  return {
    mode,
    rpcUrl,
    factoryAddress,
    factoryStartBlock: BigInt(env.PONS_FACTORY_START_BLOCK ?? "0"),
    chain: robinhoodChain(chainId, rpcUrl, mode),
  };
}

export function robinhoodChain(chainId: number, rpcUrl: string, mode: ChainMode): Chain {
  return defineChain({
    id: chainId,
    name: mode === "fork" ? "Robinhood Chain (fork lokal)" : "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}
