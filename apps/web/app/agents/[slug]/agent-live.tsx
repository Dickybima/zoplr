"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AgentStatus } from "@zoplr/core";

type Msg = { role: "user" | "assistant"; content: string };

const MAX_HISTORY = 20;

export function AgentLive({ slug, name, status }: { slug: string; name: string; status: AgentStatus }) {
  const router = useRouter();

  // Selama launching, refresh halaman berkala sampai worker menandai agent live.
  useEffect(() => {
    if (status !== "launching" && status !== "draft") return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [status, router]);

  if (status === "draft") return <p className="muted">Menunggu transaksi launch…</p>;
  if (status === "launching") {
    return <p className="muted">Token sedang dibuat di Pons V2. Halaman ini otomatis update…</p>;
  }
  if (status !== "live") return null;
  return <Chat slug={slug} name={name} />;
}

function Chat({ slug, name }: { slug: string; name: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      // Kirim riwayat terakhir saja; pastikan diawali pesan user.
      let trimmed = history.slice(-MAX_HISTORY);
      while (trimmed[0]?.role !== "user") trimmed = trimmed.slice(1);

      const res = await fetch(`/api/agents/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: trimmed }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      setMessages([...history, { role: "assistant", content: `(${(err as Error).message})` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card chat">
      <div className="messages">
        {messages.length === 0 && <p className="muted">Mulai ngobrol dengan {name}.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.content || "…"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="row" onSubmit={send} style={{ maxWidth: "none", flexDirection: "row" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pesan untuk ${name}…`}
          maxLength={4000}
        />
        <button className="button" disabled={busy}>
          Kirim
        </button>
      </form>
    </div>
  );
}
