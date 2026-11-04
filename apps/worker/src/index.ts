/**
 * Zoplr worker (opsional) — polling terus-menerus untuk memverifikasi launch.
 *
 * Di Vercel worker ini TIDAK diperlukan: halaman agent memverifikasi sendiri
 * saat dibuka. Jalankan worker hanya jika hosting non-serverless (VPS,
 * Railway, Fly) dan ingin agent jadi live walau tidak ada yang membuka halamannya.
 */
import { verifyAllLaunching } from "@zoplr/launch";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 4000);

async function main() {
  console.log(`Zoplr worker jalan — poll tiap ${POLL_MS}ms`);
  for (;;) {
    await verifyAllLaunching();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
