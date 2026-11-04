import { NextResponse } from "next/server";
import { agents, eq, getDb } from "@zoplr/db";

export const runtime = "nodejs";

/** Metadata token (dipakai sebagai metadataURI saat launch). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [agent] = await getDb().select().from(agents).where(eq(agents.slug, slug));
  if (!agent) return NextResponse.json({ error: "not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    name: agent.name,
    symbol: agent.ticker,
    description: agent.description,
    image: agent.imageUrl ?? null,
    external_url: `${origin}/agents/${agent.slug}`,
    attributes: [{ trait_type: "platform", value: "zoplr" }],
  });
}
