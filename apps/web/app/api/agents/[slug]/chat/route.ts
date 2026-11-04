import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildSystemPrompt } from "@zoplr/core";
import { agents, eq, getDb } from "@zoplr/db";
import { anthropic, CHAT_EFFORT, DEFAULT_MODEL } from "@/lib/claude";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30)
    .refine((m) => m[0]!.role === "user" && m.at(-1)!.role === "user", {
      message: "Percakapan harus diawali dan diakhiri pesan user",
    }),
});

const LIMIT = Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 20);

/** Chat dengan agent. Respons di-stream sebagai teks biasa. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`chat:${ip}`, LIMIT)) {
    return new Response("Terlalu banyak pesan, coba lagi sebentar.", { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Request tidak valid", { status: 400 });

  const [agent] = await getDb().select().from(agents).where(eq(agents.slug, slug));
  if (!agent) return new Response("Agent tidak ditemukan", { status: 404 });
  if (agent.status !== "live") return new Response("Agent belum live", { status: 403 });

  const stream = anthropic.beta.messages.stream({
    model: agent.model ?? DEFAULT_MODEL,
    max_tokens: 8000,
    system: [
      { type: "text", text: buildSystemPrompt(agent), cache_control: { type: "ephemeral" } },
    ],
    messages: parsed.data.messages,
    output_config: { effort: CHAT_EFFORT },
    // Jika model menolak karena filter keamanan, API otomatis mencoba model cadangan.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n(Maaf, aku tidak bisa membantu permintaan itu.)"));
        }
      } catch (err) {
        const msg =
          err instanceof Anthropic.RateLimitError
            ? "Agent sedang sibuk, coba lagi sebentar."
            : "Terjadi kesalahan saat menghubungi agent.";
        console.error("[chat]", err);
        controller.enqueue(encoder.encode(`\n\n(${msg})`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
