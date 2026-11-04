import { notFound } from "next/navigation";
import { agents, eq, getDb } from "@zoplr/db";
import { AgentLive } from "./agent-live";

export const dynamic = "force-dynamic";

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [agent] = await getDb().select().from(agents).where(eq(agents.slug, slug));
  if (!agent) notFound();

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
