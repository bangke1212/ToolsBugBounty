import { formatAmount, formatDate, shortAddress } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800";

export default function Dashboard({
  store,
  goToTab,
}: {
  store: HunterStore;
  goToTab: (tab: string) => void;
}) {
  const { stats, programs, reports, payouts, findings, targets, chains, resetDemo } = store;

  const escrowText =
    stats.escrowByToken.length > 0
      ? stats.escrowByToken.map(([t, v]) => `${formatAmount(v)} ${t}`).join(" · ")
      : "0";
  const paidText =
    stats.paidByToken.length > 0
      ? stats.paidByToken.map(([t, v]) => `${formatAmount(v)} ${t}`).join(" · ")
      : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Target</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {stats.totalTargets}
            <span className="ml-1 text-sm font-semibold text-slate-500">
              ({stats.authorizedTargets} berizin)
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Temuan</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalFindings}</p>
          <p className="text-xs text-slate-500">
            Critical {stats.findingsBySeverity.get("Critical") ?? 0} · High{" "}
            {stats.findingsBySeverity.get("High") ?? 0} · Medium{" "}
            {stats.findingsBySeverity.get("Medium") ?? 0} · Low{" "}
            {stats.findingsBySeverity.get("Low") ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Rantai Serangan</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.totalChains}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Panggilan AI</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.aiCalls}</p>
          <p className="text-xs text-slate-500">{stats.aiTokens} token tercatat</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Program / Laporan</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {stats.totalPrograms} / {stats.totalReports}
          </p>
          <p className="text-xs text-slate-500">
            Escrow {escrowText} · Dibayar {paidText}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Temuan Terbaru</h2>
          {findings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Belum ada temuan.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {findings.slice(0, 5).map((f) => {
                const target = targets.find((t) => t.id === f.targetId);
                return (
                  <li key={f.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {f.title}
                      {f.demo && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Contoh
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {target?.name ?? "—"} · {f.vulnClass} · {f.severity} · {f.status} ·{" "}
                      {formatDate(f.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <button onClick={() => goToTab("temuan")} className={`${inputCls} mt-4`}>
            Lihat Semua Temuan
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Status Temuan</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {["Baru", "Dikonfirmasi", "Dilaporkan", "Dibayar", "Ditolak"].map((s) => (
              <li key={s} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="font-medium text-slate-700">{s}</span>
                <span className="font-bold text-slate-900">{stats.findingsByStatus.get(s) ?? 0}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg font-bold text-slate-900">Cara Kerja (Simulasi)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
            <li>Tambah target website / kontrak dan konfirmasi scope berizin.</li>
            <li>Jalankan checklist recon terpandu per target.</li>
            <li>Catat temuan dengan kelas dari taksonomi 191 skill.</li>
            <li>Susun rantai serangan dari temuan, lalu minta analisis AI (bila dikonfigurasi).</li>
            <li>Susun laporan Markdown dan kirim temuan terkonfirmasi ke modul Platform.</li>
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
        <h2 className="text-lg font-bold text-slate-900">Rantai &amp; Pembayaran Terakhir</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">Rantai serangan</p>
            {chains.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Belum ada rantai.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {chains.slice(0, 3).map((c) => (
                  <li key={c.id} className="text-slate-700">
                    {c.name} — {c.steps.length} langkah
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Pembayaran terakhir (Platform)</p>
            {payouts.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Belum ada pembayaran.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
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
        <p className="mt-4 text-xs text-slate-500">
          Laporan platform terbaru:{" "}
          {reports.length > 0
            ? `${reports[0].title} — ${reports[0].status} — ${shortAddress(reports[0].hunter)}`
            : "belum ada laporan."}{" "}
          Program: {programs.length > 0 ? programs[0].name : "belum ada program."}
        </p>
      </div>
    </div>
  );
}
