/**
 * Test integrasi terhadap fork mainnet (Anvil). Dilewati kecuali FORK_TEST=1.
 *
 * Jalankan:
 *   pnpm fork          # terminal 1
 *   pnpm test:fork     # terminal 2
 *
 * Memakai akun default Anvil #0 (dana palsu) untuk launch token sungguhan
 * lewat factory Pons V2 yang ter-fork.
 */
import { describe, expect, it } from "vitest";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildLaunchRequest, findLaunchInReceipt, loadPonsConfig } from "@zoplr/pons";

// Private key publik bawaan Anvil — HANYA untuk fork lokal, jangan pernah dipakai di mainnet.
const ANVIL_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe.skipIf(!process.env.FORK_TEST)("Pons V2 launch di fork", () => {
  it("membuat token dan menemukan event-nya di receipt", async () => {
    const config = loadPonsConfig({ ...process.env, ZOPLR_CHAIN_MODE: "fork" });
    const account = privateKeyToAccount(ANVIL_KEY_0);
    const transport = http(config.rpcUrl);
    const publicClient = createPublicClient({ chain: config.chain, transport });
    const wallet = createWalletClient({ account, chain: config.chain, transport });

    const code = await publicClient.getCode({ address: config.factoryAddress });
    expect(code, "Factory tidak ada di fork — cek PONS_FACTORY_ADDRESS").toBeDefined();

    const ticker = `T${Date.now() % 100000}`;
    const request = buildLaunchRequest(config.factoryAddress, {
      name: `Zoplr Fork Test ${ticker}`,
      ticker,
      metadataURI: "https://example.com/metadata.json",
    });

    const { request: simulated } = await publicClient.simulateContract({ ...request, account });
    const hash = await wallet.writeContract(simulated);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    expect(receipt.status).toBe("success");
    const launched = findLaunchInReceipt(receipt, config.factoryAddress);
    expect(launched?.symbol).toBe(ticker);
    expect(launched?.creator.toLowerCase()).toBe(account.address.toLowerCase());
  }, 60_000);
});
