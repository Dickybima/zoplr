import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { and, desc, eq, isNull } from "drizzle-orm";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Koneksi database tunggal (di-cache supaya hot reload Next.js tidak bocor koneksi). */
export function getDb() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Env DATABASE_URL wajib diisi");
    cached = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return cached;
}
