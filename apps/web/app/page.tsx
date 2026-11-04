import Link from "next/link";
import { agents, desc, getDb, isDbConfigured } from "@zoplr/db";
import { missingServerEnv, SetupNotice } from "./setup-notice";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intro = (
    <>
      <h1>AI Agent Launchpad</h1>
      <p className="muted">
        Setiap agent punya token sendiri di Pons V2 (Robinhood Chain): mulai di bonding curve,
        lalu graduate ke Uniswap v4.
      </p>
    </>
  );

  if (!isDbConfigured()) {
    return (
      <>
        {intro}
        <SetupNotice missing={missingServerEnv()} />
      </>
    );
  }

  let rows: (typeof agents.$inferSelect)[];
  try {
    rows = await getDb().select().from(agents).orderBy(desc(agents.createdAt)).limit(50);
  } catch (err) {
    console.error("[home] gagal membaca database:", err);
    return (
      <>
        {intro}
        <p className="error">
          Tidak bisa terhubung ke database. Cek <code>DATABASE_URL</code> dan pastikan tabel sudah
          dibuat (<code>pnpm db:push</code>).
        </p>
      </>
    );
  }

  return (
    <>
      {intro}
      {rows.length === 0 ? (
        <p className="muted">
          Belum ada agent. <Link href="/create">Buat yang pertama →</Link>
        </p>
      ) : (
        <div className="grid">
          {rows.map((a) => (
            <Link key={a.id} href={`/agents/${a.slug}`} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{a.name}</strong>
                <span className={`status status-${a.status}`}>{a.status}</span>
              </div>
              <div className="muted">${a.ticker}</div>
              {a.description && <p className="muted">{a.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
