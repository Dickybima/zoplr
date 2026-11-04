import { notFound } from "next/navigation";
import { agents, eq, getDb, isDbConfigured } from "@zoplr/db";
import { verifyLaunch } from "@zoplr/launch";
import { missingServerEnv, SetupNotice } from "../../setup-notice";
import { AgentLive } from "./agent-live";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isDbConfigured()) return <SetupNotice missing={missingServerEnv()} />;

  const { slug } = await params;
  const db = getDb();
  let [agent] = await db.select().from(agents).where(eq(agents.slug, slug));
  if (!agent) notFound();

  // Tanpa worker (mis. di Vercel): verifikasi launch setiap kali halaman di-refresh.
  if (agent.status === "launching") {
    try {
      const result = await verifyLaunch(agent);
      if (result === "live" || result === "failed") {
        [agent] = await db.select().from(agents).where(eq(agents.slug, slug));
        if (!agent) notFound();
      }
    } catch (err) {
      console.error(`[agent] verifikasi launch ${slug} gagal:`, err);
    }
  }

  return (
    <>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <h1>
          {agent.name} <span className="muted">${agent.ticker}</span>
        </h1>
        <span className={`status status-${agent.status}`}>{agent.status}</span>
      </div>
      {agent.description && <p className="muted">{agent.description}</p>}
      {agent.tokenAddress && (
        <p className="muted">
          Token: <code>{agent.tokenAddress}</code>
        </p>
      )}
      {agent.status === "failed" && <p className="error">Launch gagal: {agent.failureReason}</p>}
      <AgentLive slug={agent.slug} name={agent.name} status={agent.status} />
    </>
  );
}
