/**
 * ⚠️ PLACEHOLDER ABI — GANTI DENGAN ABI RESMI PONS V2 ⚠️
 *
 * Fungsi & event di bawah adalah TEBAKAN bentuk umum factory launchpad.
 * Sebelum dipakai (bahkan di fork), ambil ABI asli dari docs resmi Pons
 * atau dari kontrak terverifikasi di block explorer Robinhood Chain,
 * lalu sesuaikan `launch.ts` (encodeLaunchArgs & parseLaunchEvent).
 *
 * File ini & launch.ts adalah SATU-SATUNYA tempat yang perlu diubah.
 */
export const ponsV2FactoryAbi = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "event",
    name: "TokenCreated",
    anonymous: false,
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
  },
] as const;

export const PONS_ABI_IS_PLACEHOLDER = true;
