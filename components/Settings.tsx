import { useEffect, useState } from "react";
import { getAiStatus } from "../lib/ai";
import type { AiStatus } from "../lib/ai";
import { formatDate } from "../lib/types";
import type { HunterStore } from "../lib/store";

export default function Settings({ store }: { store: HunterStore }) {
  const { aiUsage, clearAiUsage } = store;
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let alive = true;
    getAiStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalTokens = aiUsage.reduce((sum, u) => sum + (u.totalTokens ?? 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Konfigurasi AI</h2>
          {status === null && <p className="mt-2 text-sm text-slate-500">Memeriksa status AI…</p>}
          {status !== null && (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-medium text-slate-600">Status</dt>
                <dd className="font-bold text-slate-900">
                  {status.configured ? "Aktif" : "Belum dikonfigurasi"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-medium text-slate-600">Model aktif</dt>
                <dd className="font-mono font-bold text-slate-900">
                  {status.configured ? status.model : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                <dt className="font-medium text-slate-600">Base URL</dt>
                <dd className="font-mono text-slate-900">{status.baseUrl || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-medium text-slate-600">API key</dt>
                <dd className="font-bold text-slate-900">
                  {status.configured ? "Terisi (tidak ditampilkan)" : "Belum diisi"}
                </dd>
              </div>
            </dl>
          )}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Nama model saja yang ditampilkan di sini. Nilai API key tidak pernah dikirim ke
            browser, tidak pernah di-log, dan tidak pernah ditampilkan di UI mana pun.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Cara Mengisi API Key &amp; Model</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li>
              Salin <code className="font-mono text-xs">.env.example</code> menjadi{" "}
              <code className="font-mono text-xs">.env</code> untuk pengembangan lokal, lalu isi
              nilainya:
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
{`MODEL_API_BASE_URL=https://api.meta.ai/v1
MODEL_API_KEY=(kunci API kamu)
MODEL_API_MODEL=muse-spark-1.3`}
              </pre>
            </li>
            <li>
              Restart server pengembangan (<code className="font-mono text-xs">npm run dev</code>)
              setelah mengubah <code className="font-mono text-xs">.env</code>.
            </li>
            <li>
              Untuk Vercel: isi lewat Project Settings → Environment Variables dengan nama yang
              sama, lalu redeploy.
            </li>
            <li>
              Jangan pernah commit file <code className="font-mono text-xs">.env</code> dan jangan
              pernah menempelkan kunci API di chat, issue, atau screenshot.
            </li>
          </ol>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Log Pemakaian AI (Otomatis)</h2>
          <button
            onClick={() => {
              if (window.confirm("Hapus semua log pemakaian AI?")) clearAiUsage();
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hapus Log
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Setiap panggilan AI tercatat otomatis: waktu, model, jenis prompt, dan estimasi token
          bila dikembalikan API. Total panggilan berhasil:{" "}
          <strong className="text-slate-900">{aiUsage.filter((u) => u.ok).length}</strong> · total
          token: <strong className="text-slate-900">{totalTokens}</strong>
        </p>
        {aiUsage.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Belum ada panggilan AI. Log akan muncul di sini setelah kamu memakai AI Assist.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {aiUsage.map((u) => (
              <li key={u.id} className="rounded-lg border border-slate-100 p-3">
                <p className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold text-slate-900">{u.kind}</span>
                  <span className={u.ok ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {u.ok ? "Berhasil" : "Gagal"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(u.at)} · Model <span className="font-mono">{u.model || "—"}</span>
                  {u.totalTokens !== undefined && <> · {u.totalTokens} token</>}
                  {u.promptTokens !== undefined && <> (prompt {u.promptTokens} / completion {u.completionTokens ?? 0})</>}
                </p>
                {u.note && <p className="mt-1 text-xs text-slate-600">{u.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
