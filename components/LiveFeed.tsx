import { useEffect, useState } from "react";
import { formatDate } from "../lib/types";
import { useLiveFeed } from "../lib/useLiveFeed";
import type { HunterStore } from "../lib/store";

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return "belum pernah";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

export default function LiveFeed({
  store,
  goToTab,
}: {
  store: HunterStore;
  goToTab: (tab: string) => void;
}) {
  const { configured, feed, lastSyncedAt, error, refresh } = useLiveFeed();
  const { targets, findings, importFinding } = store;
  // `now` diisi di useEffect (bukan initializer useState): membaca Date.now()
  // saat prerender ditolak Next.js 16 (Cache Components).
  const [now, setNow] = useState<number | null>(null);
  const [importNotice, setImportNotice] = useState("");

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          Live Feed
          {configured ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              Belum dikonfigurasi
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {configured && (
            <span>diperbarui {now === null ? "…" : timeAgo(lastSyncedAt, now)}</span>
          )}
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Muat ulang
          </button>
        </div>
      </div>

      {!configured ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Live belum dikonfigurasi — temuan hanya tersimpan lokal di browser ini. Aktifkan
            dengan membuat KV store di Vercel (lihat Pengaturan).
          </p>
          <button
            onClick={() => goToTab("pengaturan")}
            className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Lihat cara setup di Pengaturan
          </button>
        </div>
      ) : feed.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Belum ada temuan di Live Feed. Tambah temuan di tab Temuan — temuan baru otomatis
          masuk ke feed ini.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {feed.map((f) => {
            const target = targets.find((t) => t.id === f.targetId);
            const alreadyLocal = findings.some((x) => x.id === f.id);
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
                <p className="mt-0.5 text-xs text-slate-400">
                  Masuk feed {formatDate(f.syncedAt)}
                </p>
                <div className="mt-2">
                  {alreadyLocal ? (
                    <span className="text-xs font-semibold text-emerald-700">Sudah di Temuan</span>
                  ) : (
                    <button
                      onClick={() => {
                        if (importFinding(f)) {
                          setImportNotice(`"${f.title}" disimpan ke Temuan.`);
                        }
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Simpan ke Temuan
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-3 text-xs font-medium text-red-700">{error}</p>}
      {importNotice && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {importNotice}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Feed diperbarui tiap 5 detik saat tab terlihat. Hanya temuan yang hunter
        simpan/konfirmasi yang masuk feed — bukan deteksi otomatis.
      </p>
    </div>
  );
}
