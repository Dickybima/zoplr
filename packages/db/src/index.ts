import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { and, desc, eq, isNull } from "drizzle-orm";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** True jika DATABASE_URL sudah diisi (dipakai halaman untuk menampilkan pesan setup). */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Koneksi database tunggal (di-cache supaya hot reload / serverless tidak bocor koneksi). */
export function getDb() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Env DATABASE_URL wajib diisi");
    const serverless = Boolean(process.env.VERCEL);
    cached = drizzle(
      postgres(url, {
        // Serverless: sedikit koneksi per instance. `prepare: false` wajib untuk
        // pooler mode transaksi (Neon/Supabase pooler, PgBouncer).
        max: serverless ? 1 : 10,
        prepare: false,
      }),
      { schema },
    );
  }
  return cached;
}
