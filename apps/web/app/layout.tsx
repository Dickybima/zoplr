import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { chainMode } from "@/lib/chain";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoplr — AI Agent Launchpad",
  description: "Buat AI agent dan launch token-nya di Pons V2.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>
          {chainMode === "fork" && (
            <div className="banner">Mode FORK lokal — transaksi memakai dana palsu</div>
          )}
          <header className="header">
            <Link href="/" className="logo">
              zoplr
            </Link>
            <Link href="/create" className="button">
              + Buat Agent
            </Link>
          </header>
          <main className="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
