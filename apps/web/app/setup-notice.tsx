/** Ditampilkan jika env wajib belum diisi (mis. deploy pertama di Vercel). */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="card">
      <h2>Konfigurasi belum lengkap</h2>
      <p className="muted">
        Isi environment variable berikut (di Vercel: Project → Settings → Environment Variables),
        lalu redeploy:
      </p>
      <ul>
        {missing.map((m) => (
          <li key={m}>
            <code>{m}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Daftar env server yang wajib untuk menjalankan Zoplr. */
export function missingServerEnv(): string[] {
  const required = ["DATABASE_URL", "PONS_CHAIN_ID", "PONS_FACTORY_ADDRESS"];
  if (process.env.ZOPLR_CHAIN_MODE === "mainnet") required.push("MAINNET_RPC_URL");
  return required.filter((k) => !process.env[k]);
}
