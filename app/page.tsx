"use client";

import { useState } from "react";
import { useBugBountyStore } from "../lib/store";
import { CHAINS } from "../lib/chains";
import { formatAmount, formatDate, shortAddress } from "../lib/types";
import WalletBar from "../components/WalletBar";
import Programs from "../components/Programs";
import Reports from "../components/Reports";
import Ledger from "../components/Ledger";
import TaxonomyBrowser from "../components/TaxonomyBrowser";

type Tab = "dashboard" | "program" | "laporan" | "ledger" | "rantai" | "taksonomi";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "program", label: "Program" },
  { id: "laporan", label: "Laporan" },
  { id: "ledger", label: "Ledger Payout" },
  { id: "rantai", label: "Rantai EVM" },
  { id: "taksonomi", label: "Taksonomi 191 Skill" },
];

export default function Home() {
  const store = useBugBountyStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const { stats, programs, reports, payouts, chainId, switchChain, resetDemo } = store;

  const escrowText =
    stats.escrowByToken.length > 0
      ? stats.escrowByToken.map(([t, v]) => `${formatAmount(v)} ${t}`).join(" · ")
      : "0";
  const paidText =
    stats.paidByToken.length > 0
      ? stats.paidByToken.map(([t, v]) => `${formatAmount(v)} ${t}`).join(" · ")
      : "0";

  return (
    <div className="min-h-screen">
      {/* Banner simulasi */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
        <p className="mx-auto max-w-6xl text-center text-xs leading-relaxed font-medium text-amber-900 sm:text-sm">
          <span className="mr-1 rounded bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            SIMULASI
          </span>
          Prototipe DApp — belum ada smart contract yang ter-deploy, tidak ada dana sungguhan, dan
          wallet di sini hanya simulasi. Hanya uji kerentanan pada target berizin.
        </p>
      </div>

      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
          Bug Bounty · On-Chain · 32 Chain EVM
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Platform Bug Bounty On-Chain
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Buat program bounty, kirim laporan kerentanan dengan klasifikasi taksonomi 191 skill,
          jalankan triase, dan bayar dari escrow — di semua chain EVM, mainnet dan testnet.
          Semua alur di halaman ini berjalan lokal di browser (localStorage) sebagai simulasi.
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
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Total Program</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalPrograms}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Total Laporan</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalReports}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Escrow Terkunci</p>
                  <p className="mt-1 text-lg leading-8 font-black text-slate-900">{escrowText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Total Dibayar</p>
                  <p className="mt-1 text-lg leading-8 font-black text-emerald-700">{paidText}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Hunter Unik</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalHunters}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Laporan Terbaru</h2>
                  {reports.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Belum ada laporan.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {reports.slice(0, 5).map((r) => {
                        const program = programs.find((p) => p.id === r.programId);
                        return (
                          <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {r.title}
                              {r.demo && (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  Contoh
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {program?.name ?? "—"} · {r.vulnClass} · {r.severity} · {r.status} ·{" "}
                              {shortAddress(r.hunter)} · {formatDate(r.createdAt)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button
                    onClick={() => setTab("laporan")}
                    className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Lihat Semua Laporan
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Status Laporan</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {["Baru", "Triase", "Diterima", "Ditolak", "Duplikat", "Dibayar"].map((s) => (
                      <li key={s} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                        <span className="font-medium text-slate-700">{s}</span>
                        <span className="font-bold text-slate-900">{stats.byStatus.get(s) ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                  <h2 className="mt-6 text-lg font-bold text-slate-900">Cara Kerja (Simulasi)</h2>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
                    <li>Hubungkan wallet simulasi dan pilih chain EVM (32 chain).</li>
                    <li>Buat program bounty — pool escrow terkunci penuh.</li>
                    <li>Hunter mengirim laporan dengan kelas dari taksonomi 191 skill.</li>
                    <li>Triase: Baru → Triase → Diterima / Ditolak / Duplikat.</li>
                    <li>Laporan Diterima dibayar dari escrow; payout tercatat di Ledger dengan hash TX simulasi.</li>
                  </ol>
                  <button
                    onClick={() => {
                      if (window.confirm("Reset semua data ke contoh awal?")) resetDemo();
                    }}
                    className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset ke Data Contoh
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Pembayaran Terakhir</h2>
                {payouts.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Belum ada pembayaran. Coba alur demo: buka tab Laporan, terima laporan contoh, lalu bayar dari escrow.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {payouts.slice(0, 3).map((p) => (
                      <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                        <span className="font-medium text-slate-900">{p.reportTitle}</span>
                        <span className="font-bold text-emerald-700">
                          +{formatAmount(p.amount)} {p.token}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "program" && <Programs store={store} />}
          {tab === "laporan" && <Reports store={store} />}
          {tab === "ledger" && <Ledger payouts={payouts} />}

          {tab === "rantai" && (
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
          Platform Bug Bounty On-Chain — prototipe simulasi untuk belajar. Bukan kontrak pintar
          sungguhan, bukan saran investasi, dan tidak ada dana yang bergerak. Taksonomi skill dari
          akashrpatil/awesome-offensive-security-skills (Apache-2.0). Uji keamanan hanya pada
          target dengan izin tertulis.
        </p>
      </footer>
    </div>
  );
}
