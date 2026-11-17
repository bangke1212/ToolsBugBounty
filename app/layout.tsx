import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hunter Command Center — Temukan Bug Bounty di Website & Blockchain",
  description:
    "Prototipe Hunter Command Center: target & scope, recon terpandu, temuan, rantai serangan, AI Assist, dan laporan bug bounty untuk website dan blockchain di 32 chain EVM. Semua simulasi — hanya target berizin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#FAF9F6] text-[#0F172A] antialiased">{children}</body>
    </html>
  );
}
