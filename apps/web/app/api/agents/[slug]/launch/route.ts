import { NextResponse } from "next/server";
import { z } from "zod";
import { agents, and, eq, getDb } from "@zoplr/db";

export const runtime = "nodejs";

const Body = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) });

/**
 * Langkah 2: browser melapor hash tx launch. Endpoint ini TIDAK percaya
 * begitu saja — worker yang memverifikasi receipt on-chain (status, event
 * factory, dan creator) sebelum agent ditandai `live`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "txHash tidak valid" }, { status: 400 });

  const updated = await getDb()
    .update(agents)
    .set({ status: "launching", launchTxHash: parsed.data.txHash.toLowerCase(), updatedAt: new Date() })
    .where(and(eq(agents.slug, slug), eq(agents.status, "draft")))
    .returning({ slug: agents.slug });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Agent tidak ditemukan atau sudah di-launch" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
