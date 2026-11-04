"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BaseError } from "viem";
import {
  useAccount,
  useChainId,
  useConnect,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { buildLaunchRequest } from "@zoplr/pons";
import { createAgentMessage } from "@/lib/auth";
import { canLaunch, chain, chainMode, factoryAddress } from "@/lib/chain";

type Step = "idle" | "signing" | "saving" | "simulating" | "confirming" | "reporting";

const STEP_LABEL: Record<Step, string> = {
  idle: "Launch Agent",
  signing: "Tanda tangani pesan di wallet…",
  saving: "Menyimpan agent…",
  simulating: "Simulasi transaksi…",
  confirming: "Konfirmasi transaksi di wallet…",
  reporting: "Mengirim ke indexer…",
};

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: chain.id });

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!address || !publicClient) return;
    if (!factoryAddress) {
      setError("NEXT_PUBLIC_PONS_FACTORY_ADDRESS belum diisi di .env");
      return;
    }

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const ticker = String(form.get("ticker") ?? "").trim().toUpperCase();
    const description = String(form.get("description") ?? "");
    const persona = String(form.get("persona") ?? "");
    const imageUrl = String(form.get("imageUrl") ?? "").trim() || undefined;

    try {
      if (currentChainId !== chain.id) await switchChainAsync({ chainId: chain.id });

      // 1. Buktikan kepemilikan wallet
      setStep("signing");
      const issuedAt = new Date().toISOString();
      const signature = await signMessageAsync({
        message: createAgentMessage({ name, ticker, issuedAt }),
      });

      // 2. Simpan draft agent
      setStep("saving");
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ticker,
          description,
          persona,
          imageUrl,
          creatorAddress: address,
          issuedAt,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data.error));
      const { slug, metadataURI } = data as { slug: string; metadataURI: string };

      // 3. Simulasi dulu supaya tidak buang gas kalau akan revert
      setStep("simulating");
      const request = buildLaunchRequest(factoryAddress, { name, ticker, metadataURI });
      await publicClient.simulateContract({ ...request, account: address });

      // 4. User tanda tangan transaksi launch di Pons V2
      setStep("confirming");
      const txHash = await writeContractAsync({ ...request, chainId: chain.id });

      // 5. Laporkan tx hash; worker memverifikasi on-chain lalu agent jadi live
      setStep("reporting");
      await fetch(`/api/agents/${slug}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash }),
      });

      router.push(`/agents/${slug}`);
    } catch (err) {
      setError(err instanceof BaseError ? err.shortMessage : (err as Error).message);
      setStep("idle");
    }
  }

  if (!isConnected) {
    return (
      <>
        <h1>Buat Agent</h1>
        <p className="muted">Hubungkan wallet untuk membuat agent dan launch token-nya.</p>
        {connectors.map((c) => (
          <button key={c.uid} className="button" onClick={() => connect({ connector: c })}>
            Hubungkan {c.name}
          </button>
        ))}
      </>
    );
  }

  const allowed = canLaunch(address);
  const busy = step !== "idle";

  return (
    <>
      <h1>Buat Agent</h1>
      <p className="muted">
        Wallet: <code>{address}</code>
        {chainMode === "mainnet" && " — transaksi memakai ETH sungguhan."}
      </p>
      {!allowed && (
        <p className="error">Wallet ini belum ada di allowlist launch (soft-launch).</p>
      )}
      <form onSubmit={onSubmit}>
        <label>
          Nama agent
          <input name="name" required minLength={2} maxLength={32} placeholder="Satoshi Cat" />
        </label>
        <label>
          Ticker
          <input name="ticker" required pattern="[A-Za-z0-9]{2,10}" placeholder="SCAT" />
        </label>
        <label>
          Deskripsi singkat
          <input name="description" maxLength={280} placeholder="Kucing sarkas yang paham blockchain" />
        </label>
        <label>
          Persona (system prompt)
          <textarea
            name="persona"
            required
            minLength={20}
            maxLength={4000}
            placeholder="Kamu adalah kucing sarkas yang menjelaskan konsep blockchain dengan bahasa sederhana…"
          />
        </label>
        <label>
          URL gambar (opsional)
          <input name="imageUrl" type="url" placeholder="https://…" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" type="submit" disabled={busy || !allowed}>
          {STEP_LABEL[step]}
        </button>
      </form>
    </>
  );
}

function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fields = (error as { fieldErrors: Record<string, string[]> }).fieldErrors;
    return Object.entries(fields)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join("; ");
  }
  return "Gagal menyimpan agent";
}
