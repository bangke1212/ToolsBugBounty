import { useMemo, useState } from "react";
import { CHAIN_RECON_STEPS, WEB_RECON_STEPS } from "../lib/recon";
import { targetLabel } from "../lib/types";
import type { HunterStore } from "../lib/store";

export default function Recon({ store }: { store: HunterStore }) {
  const { targets, reconDone, toggleReconStep, findings } = store;
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const steps = useMemo(
    () => (target?.kind === "contract" ? CHAIN_RECON_STEPS : WEB_RECON_STEPS),
    [target]
  );
  const done = target ? reconDone[target.id] ?? [] : [];
  const progress = steps.length > 0 ? Math.round((done.length / steps.length) * 100) : 0;

  const overall = useMemo(() => {
    let total = 0;
    let finished = 0;
    for (const t of targets) {
      const list = t.kind === "contract" ? CHAIN_RECON_STEPS : WEB_RECON_STEPS;
      total += list.length;
      finished += (reconDone[t.id] ?? []).length;
    }
    return { total, finished, pct: total > 0 ? Math.round((finished / total) * 100) : 0 };
  }, [targets, reconDone]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Recon Terpandu</h2>
        <p className="mt-1 text-sm text-slate-600">
          Checklist pemeriksaan manual per target — bukan pemindaian otomatis. Checklist hanya
          aktif bila scope target sudah dikonfirmasi berizin.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-slate-900">
            Progres keseluruhan: {overall.finished}/{overall.total} langkah ({overall.pct}%)
          </span>
          <span className="text-slate-500">
            {targets.filter((t) => t.authorized).length}/{targets.length} target terkonfirmasi
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-blue-700" style={{ width: `${overall.pct}%` }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="recon-target">
            Pilih target
          </label>
          <select
            id="recon-target"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            value={target?.id ?? ""}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {targets.length === 0 && <option value="">— Belum ada target —</option>}
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.authorized ? "" : "(belum terkonfirmasi)"}
              </option>
            ))}
          </select>

          {target && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">{target.name}</p>
              <p className="mt-1 font-mono text-xs break-all text-slate-500">{targetLabel(target)}</p>
              <p className="mt-2 text-sm text-slate-600">
                Temuan pada target ini: {findings.filter((f) => f.targetId === target.id).length}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Progres checklist: {done.length}/{steps.length} ({progress}%)
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          {!target && (
            <p className="text-sm text-slate-500">
              Belum ada target. Tambahkan target dulu di tab Target &amp; Scope.
            </p>
          )}
          {target && !target.authorized && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong>Scope belum terkonfirmasi.</strong> Checklist dikunci sampai kamu mengonfirmasi
              bahwa target ini berizin untuk diuji (tab Target &amp; Scope → “Konfirmasi scope
              berizin”).
            </div>
          )}
          {target && (
            <ul className="mt-4 space-y-3">
              {steps.map((s) => {
                const checked = done.includes(s.id);
                return (
                  <li key={s.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!target.authorized}
                      onChange={() => toggleReconStep(target.id, s.id)}
                      className="mt-1"
                      aria-label={s.label}
                    />
                    <div>
                      <p className={`text-sm font-semibold ${checked ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.detail}</p>
                      {s.skill && (
                        <p className="mt-1 font-mono text-xs text-blue-700">{s.skill}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
