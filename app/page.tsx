"use client";

import { useState } from "react";
import { useBugBountyStore } from "../lib/store";
import { CHAINS } from "../lib/chains";
import WalletBar from "../components/WalletBar";
import Dashboard from "../components/Dashboard";
import Targets from "../components/Targets";
import Recon from "../components/Recon";
import Findings from "../components/Findings";
import AttackChains from "../components/AttackChains";
import AiAssist from "../components/AiAssist";
import ReportBuilder from "../components/ReportBuilder";
import Settings from "../components/Settings";
import Programs from "../components/Programs";
import Reports from "../components/Reports";
import Ledger from "../components/Ledger";
import TaxonomyBrowser from "../components/TaxonomyBrowser";

type Tab =
  | "dashboard"
  | "target"
  | "recon"
  | "temuan"
  | "rantai"
  | "ai"
  | "laporan"
  | "platform"
  | "rantai-evm"
  | "taksonomi"
  | "pengaturan";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "target", label: "Target & Scope" },
  { id: "recon", label: "Recon" },
  { id: "temuan", label: "Temuan" },
  { id: "rantai", label: "Rantai Serangan" },
  { id: "ai", label: "AI Assist" },
  { id: "laporan", label: "Laporan" },
  { id: "platform", label: "Platform" },
  { id: "rantai-evm", label: "Rantai EVM" },
  { id: "taksonomi", label: "Taksonomi 191 Skill" },
  { id: "pengaturan", label: "Pengaturan" },
];

export default function Home() {
  const store = useBugBountyStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const { payouts, chainId, switchChain } = store;

  return (
    <div className="min-h-screen">
      {/* Banner simulasi */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <p className="mx-auto max-w-6xl text-center text-xs leading-relaxed font-medium text-amber-900 sm:text-sm">
          <span className="mr-1 rounded bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            SIMULASI
          </span>
          Hunter Command Center — prototipe untuk menemukan bug bounty di website dan blockchain.
          Tidak ada pemindaian sungguhan terhadap target live, tidak ada smart contract
          ter-deploy, dan tidak ada dana sungguhan. Hanya uji kerentanan pada target berizin.
        </p>
      </div>

      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
          Bug Bounty · Website &amp; Blockchain · 32 Chain EVM
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Hunter Command Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Kelola target dan scope, jalankan recon terpandu, lacak temuan, susun rantai serangan,
          minta analisis AI, dan susun laporan bug bounty — dengan taksonomi 191 skill dan modul
          Platform bounty on-chain di dalamnya. Semua data tersimpan lokal di browser
          (localStorage) sebagai simulasi.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <WalletBar store={store} />

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Navigasi utama">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                tab === t.id
                  ? "bg-blue-700 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section className="mt-6">
          {tab === "dashboard" && <Dashboard store={store} goToTab={(t) => setTab(t as Tab)} />}
          {tab === "target" && <Targets store={store} />}
          {tab === "recon" && <Recon store={store} />}
          {tab === "temuan" && <Findings store={store} />}
          {tab === "rantai" && <AttackChains store={store} />}
          {tab === "ai" && <AiAssist store={store} />}
          {tab === "laporan" && <ReportBuilder store={store} />}
          {tab === "pengaturan" && <Settings store={store} />}

          {tab === "platform" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Modul Platform (On-Chain)</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Fitur aplikasi sebelumnya: program bounty dengan escrow, laporan platform,
                  triase, dan Ledger Payout. Temuan terkonfirmasi di tab Temuan bisa dikirim ke
                  sini sebagai laporan.
                </p>
              </div>
              <Programs store={store} />
              <Reports store={store} />
              <Ledger payouts={payouts} />
            </div>
          )}

          {tab === "rantai-evm" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">32 Chain EVM</h2>
              <p className="mt-1 text-sm text-slate-600">
                16 jaringan, masing-masing mainnet + testnet. Chain ID terverifikasi dari registry
                chainid.network. Klik sebuah chain untuk menjadikannya chain aktif wallet simulasi.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CHAINS.map((c) => {
                  const active = c.id === chainId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => switchChain(c.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                        {active ? (
                          <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[11px] font-bold text-white">
                            AKTIF
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {c.testnet ? "Testnet" : "Mainnet"}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-slate-500">
                        Chain ID {c.id} · {c.symbol}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">{c.network}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "taksonomi" && <TaxonomyBrowser />}
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs leading-relaxed text-slate-500">
          Hunter Command Center — prototipe simulasi untuk belajar menemukan bug bounty di website
          dan blockchain. Bukan scanner sungguhan, bukan smart contract, bukan saran investasi,
          dan tidak ada dana yang bergerak. Taksonomi skill dari
          akashrpatil/awesome-offensive-security-skills (Apache-2.0). Uji keamanan hanya pada
          target dengan izin tertulis.
        </p>
      </footer>
    </div>
  );
}
