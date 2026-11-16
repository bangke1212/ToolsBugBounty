import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platform Bug Bounty On-Chain — DApp Simulasi",
  description:
    "Prototipe platform bug bounty on-chain: program bounty, laporan kerentanan, triase, escrow, dan payout di 32 chain EVM. Semua simulasi — belum ada smart contract ter-deploy.",
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
