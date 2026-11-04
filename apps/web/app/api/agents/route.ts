import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateAgentInput, slugify } from "@zoplr/core";
import { agents, desc, eq, getDb } from "@zoplr/db";
import { verifyCreatorSignature } from "@/lib/auth";
import { chainMode } from "@/lib/chain";

export const runtime = "nodejs";

const Body = CreateAgentInput.extend({
  issuedAt: z.string(),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

/** Daftar agent terbaru. */
export async function GET() {
  const rows = await getDb()
    .select({
      slug: agents.slug,
      name: agents.name,
      ticker: agents.ticker,
      description: agents.description,
      status: agents.status,
      tokenAddress: agents.tokenAddress,
    })
    .from(agents)
    .orderBy(desc(agents.createdAt))
    .limit(50);
  return NextResponse.json(rows);
}

/**
 * Langkah 1 pembuatan agent: simpan draft. Creator harus menandatangani pesan
 * untuk membuktikan kepemilikan wallet. Token BELUM dibuat di sini — itu
 * dilakukan user dari browser lewat factory Pons V2.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { issuedAt, signature, ...input } = parsed.data;

  const ok = await verifyCreatorSignature({
    address: input.creatorAddress as `0x${string}`,
    name: input.name,
    ticker: input.ticker,
    issuedAt,
    signature: signature as `0x${string}`,
  });
  if (!ok) return NextResponse.json({ error: "Tanda tangan tidak valid" }, { status: 401 });

  const db = getDb();
  let slug = slugify(input.name) || "agent";
  const [existing] = await db.select({ id: agents.id }).from(agents).where(eq(agents.slug, slug));
  if (existing) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;

  const [agent] = await db
    .insert(agents)
    .values({
      ...input,
      slug,
      creatorAddress: input.creatorAddress.toLowerCase(),
      chainMode,
    })
    .returning({ slug: agents.slug });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    slug: agent!.slug,
    metadataURI: `${origin}/api/agents/${agent!.slug}/metadata`,
  });
}
