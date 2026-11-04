# zoplr

**AI Agent Launchpad di atas Pons V2 (Robinhood Chain).**
Setiap AI agent yang dibuat otomatis punya token sendiri: token mulai di bonding curve Pons V2, lalu graduate ke pool Uniswap v4. Begitu token tercipta, agent langsung "live" dan bisa diajak chat.

> ⚠️ **ABI Pons V2 di repo ini masih PLACEHOLDER.** Ganti `packages/pons/src/abi.ts` (dan sesuaikan `launch.ts`) dengan ABI resmi dari docs Pons atau kontrak terverifikasi di explorer **sebelum** menyentuh mainnet.

## Alur "buat agent → auto deploy"

```
Browser (wallet user)                 Server                         Chain (Pons V2)
─────────────────────                 ──────                         ───────────────
1. Tanda tangan pesan  ───────────▶  POST /api/agents
                                      verifikasi signature, simpan
                                      agent status = draft
2. simulateContract    ─────────────────────────────────────────────▶ (eth_call, tanpa gas)
3. writeContract       ─────────────────────────────────────────────▶ factory.createToken()
4. POST /launch {txHash} ─────────▶  status = launching
                                      Worker: ambil receipt ◀─────── event TokenCreated
                                      cek sukses + creator cocok
                                      status = live, simpan token
5. Halaman agent auto-refresh → chat dengan agent (Claude)
```

- **Kreator menandatangani sendiri** transaksi launch, jadi server tidak pernah memegang private key.
- **Server tidak percaya laporan browser begitu saja.** Worker memverifikasi receipt on-chain: status sukses, event dari factory, dan creator token sama dengan pembuat agent.

## Struktur

```
apps/
  web/        Next.js: UI, wallet (wagmi), API, chat streaming (Claude)
  worker/     (Opsional, non-serverless) polling verifikasi launch
packages/
  core/       Skema & validasi agent, system prompt + aturan platform
  pons/       Adapter Pons V2: ABI, config chain, build/simulate/parse launch
  db/         Skema Postgres (Drizzle)
  launch/     Verifikasi receipt launch → agent live (dipakai web & worker)
tests/fork/   Test integrasi terhadap fork mainnet (Anvil)
scripts/      fork.sh — jalankan Anvil fork
```

Hanya `packages/pons` yang tahu detail Pons. Kalau ABI atau API Pons berubah, cukup ubah folder itu.

## Development (tanpa testnet: pakai fork mainnet)

Pons V2 hanya ada di mainnet, jadi development memakai **fork mainnet lokal** lewat Anvil. Kontrak Pons asli ikut ter-fork, tapi semua transaksi memakai dana palsu.

Prasyarat: Node 22, pnpm, Docker (untuk Postgres), dan [Foundry](https://book.getfoundry.sh/getting-started/installation) (untuk `anvil`).

```bash
pnpm install
```

```bash
cp .env.example .env
```

Isi `.env`: `MAINNET_RPC_URL`, `PONS_CHAIN_ID`, `PONS_FACTORY_ADDRESS` (+ versi `NEXT_PUBLIC_*`), dan `ANTHROPIC_API_KEY`.

```bash
docker compose up -d
```

```bash
pnpm db:push
```

Lalu jalankan tiga proses ini di terminal terpisah:

```bash
pnpm fork
```

```bash
pnpm dev:worker
```

```bash
pnpm dev
```

Buka http://localhost:3000. Di MetaMask, tambahkan network `http://127.0.0.1:8545` dengan chain ID yang sama, lalu impor salah satu private key akun test yang dicetak Anvil (**hanya untuk fork, jangan pernah dipakai di mainnet**).

### Test

```bash
pnpm test
```

```bash
pnpm test:fork
```

`pnpm test` menjalankan unit test, sedangkan `pnpm test:fork` menjalankan launch token sungguhan di fork (butuh `pnpm fork` jalan). Di CI, job `fork-test` otomatis jalan setelah secret `MAINNET_RPC_URL` serta variable `PONS_CHAIN_ID` dan `PONS_FACTORY_ADDRESS` diisi di GitHub (Settings → Secrets and variables → Actions). Isi juga `FORK_BLOCK_NUMBER` supaya hasilnya konsisten.

## Deploy ke Vercel

1. **Project → Settings → Build and Deployment → Root Directory = `apps/web`.** Ini wajib karena aplikasi Next.js ada di `apps/web`, bukan di root repo. Biarkan opsi "Include files outside the root directory" aktif (default), karena web memakai package di `packages/*`.
2. **Database:** buat Postgres hosted (misalnya Neon, Supabase, atau Vercel Postgres) dan pakai *connection string pooler*-nya. Buat tabel dari komputer Anda:
   ```bash
   DATABASE_URL="<url-postgres-anda>" pnpm db:push
   ```
3. **Environment Variables** (Settings → Environment Variables): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ZOPLR_CHAIN_MODE`, `MAINNET_RPC_URL`, `PONS_CHAIN_ID`, `PONS_FACTORY_ADDRESS`, dan versi `NEXT_PUBLIC_*`-nya (lihat `.env.example`). Variabel `NEXT_PUBLIC_*` ditanam saat build, jadi **redeploy** setiap kali mengubahnya.
4. Redeploy.

Di Vercel tidak perlu worker: halaman agent memverifikasi transaksi launch sendiri setiap kali di-refresh. Mode `fork` hanya untuk lokal (Anvil di `127.0.0.1` tidak bisa diakses dari Vercel), jadi deployment Vercel harus memakai `mainnet` dengan allowlist.

## Menuju mainnet

1. Ganti ABI placeholder dengan ABI resmi, lalu pastikan `pnpm test:fork` hijau.
2. Set `ZOPLR_CHAIN_MODE=mainnet`, `NEXT_PUBLIC_ZOPLR_CHAIN_MODE=mainnet`, dan `NEXT_PUBLIC_RPC_URL` ke RPC mainnet.
3. **Soft-launch:** isi `NEXT_PUBLIC_LAUNCH_ALLOWLIST` dengan wallet tim saja, lalu lakukan beberapa kali launch kecil dengan ticker yang jelas-jelas test.
4. Kosongkan allowlist untuk membuka ke publik.

## AI agent

- Model default `claude-opus-5-5` (ubah lewat `ZOPLR_DEFAULT_MODEL`, atau per agent lewat kolom `model`).
- Chat memakai effort `low` secara default (`ZOPLR_CHAT_EFFORT`) supaya hemat token.
- Server-side fallback aktif: jika model menolak karena filter keamanan, API otomatis mencoba model cadangan.
- Persona dari kreator dibungkus aturan platform yang tidak bisa ditimpa: tidak boleh memberi saran finansial, meminta seed phrase, atau mengaku berafiliasi dengan brand.
- Rate limit chat per IP (`CHAT_RATE_LIMIT_PER_MIN`). Versi sekarang tersimpan di memori; ganti dengan Redis untuk multi-instance.

## Belum dibuat (roadmap)

- [ ] ABI & alamat resmi Pons V2
- [ ] Grafik bonding curve / holder (Bitquery atau indexer sendiri)
- [ ] Gating fitur berdasarkan kepemilikan token & status graduation
- [ ] Tools untuk agent (posting ke X/Telegram, dll.) dengan batas ketat
- [ ] Upload gambar (IPFS) untuk metadata token
- [ ] Moderasi konten yang lebih kuat
- [ ] Tinjauan hukum (regulasi token / OJK) sebelum launch publik
