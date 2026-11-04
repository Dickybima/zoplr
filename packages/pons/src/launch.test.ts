import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, type Log, type TransactionReceipt } from "viem";
import { ponsV2FactoryAbi } from "./abi";
import { buildLaunchRequest, findLaunchInReceipt } from "./launch";
import { loadPonsConfig } from "./config";

const FACTORY = "0x00000000000000000000000000000000000000f1" as const;
const TOKEN = "0x00000000000000000000000000000000000000a1" as const;
const CREATOR = "0x00000000000000000000000000000000000000c1" as const;

function fakeLaunchLog(address: `0x${string}` = FACTORY): Log {
  return {
    address,
    topics: encodeEventTopics({
      abi: ponsV2FactoryAbi,
      eventName: "TokenCreated",
      args: { token: TOKEN, creator: CREATOR },
    }) as Log["topics"],
    data: encodeAbiParameters([{ type: "string" }, { type: "string" }], ["Satoshi Cat", "SCAT"]),
  } as Log;
}

describe("buildLaunchRequest", () => {
  it("menyusun request createToken", () => {
    const req = buildLaunchRequest(FACTORY, { name: "A", ticker: "AA", metadataURI: "ipfs://x" });
    expect(req.functionName).toBe("createToken");
    expect(req.args).toEqual(["A", "AA", "ipfs://x"]);
    expect(req.value).toBe(0n);
  });
});

describe("findLaunchInReceipt", () => {
  it("menemukan token dari log factory", () => {
    const receipt = { transactionHash: "0xabc", logs: [fakeLaunchLog()] } as unknown as TransactionReceipt;
    const found = findLaunchInReceipt(receipt, FACTORY);
    expect(found?.token.toLowerCase()).toBe(TOKEN);
    expect(found?.symbol).toBe("SCAT");
  });

  it("mengabaikan log dari kontrak lain", () => {
    const other = "0x00000000000000000000000000000000000000ee" as const;
    const receipt = { transactionHash: "0xabc", logs: [fakeLaunchLog(other)] } as unknown as TransactionReceipt;
    expect(findLaunchInReceipt(receipt, FACTORY)).toBeNull();
  });
});

describe("loadPonsConfig", () => {
  const base = { PONS_CHAIN_ID: "1234", PONS_FACTORY_ADDRESS: FACTORY };

  it("mode fork default ke Anvil lokal", () => {
    const cfg = loadPonsConfig(base);
    expect(cfg.mode).toBe("fork");
    expect(cfg.rpcUrl).toBe("http://127.0.0.1:8545");
    expect(cfg.chain.id).toBe(1234);
  });

  it("mode mainnet wajib MAINNET_RPC_URL", () => {
    expect(() => loadPonsConfig({ ...base, ZOPLR_CHAIN_MODE: "mainnet" })).toThrow(/MAINNET_RPC_URL/);
  });
});
