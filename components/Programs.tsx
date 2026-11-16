import { useState } from "react";
import { CHAINS, chainLabel } from "../lib/chains";
import { formatAmount } from "../lib/types";
import type { BugBountyStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function Programs({ store }: { store: BugBountyStore }) {
  const { programs, reports, createProgram } = store;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chainId, setChainId] = useState(11155111);
  const [token, setToken] = useState("ETH");
  const [pool, setPool] = useState("10");
  const [critical, setCritical] = useState("5");
  const [high, setHigh] = useState("2");
  const [medium, setMedium] = useState("0.5");
  const [low, setLow] = useState("0.1");
  const [notice, setNotice] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const poolNum = Number(pool);
    if (!name.trim()) return setNotice("Nama program wajib diisi.");
    if (!poolNum || poolNum <= 0) return setNotice("Pool escrow harus angka lebih dari 0.");
    const tiers = {
      Critical: Number(critical) || 0,
      High: Number(high) || 0,
      Medium: Number(medium) || 0,
      Low: Number(low) || 0,
    };
    if (Object.values(tiers).some((v) => v < 0)) {
      return setNotice("Tier reward tidak boleh negatif.");
    }
    if (Math.max(...Object.values(tiers)) > poolNum) {
      return setNotice("Tier reward terbesar tidak boleh melebihi pool escrow.");
    }
    createProgram({ name: name.trim(), description: description.trim(), chainId, token, pool: poolNum, tiers });
    setName("");
    setDescription("");
    setNotice("Program berhasil dibuat (simulasi). Pool escrow terkunci penuh.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
      >
        <h2 className="text-lg font-bold text-slate-900">Buat Program Bounty</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pool escrow dikunci saat program dibuat dan hanya dilepas saat laporan dibayar.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="prog-name">Nama program</label>
            <input id="prog-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Protokol Lending DeFi" />
          </div>
          <div>
            <label className={labelCls} htmlFor="prog-desc">Deskripsi &amp; scope</label>
            <textarea id="prog-desc" className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan target yang masuk scope (hanya target berizin)." />
          </div>
          <div>
            <label className={labelCls} htmlFor="prog-chain">Chain</label>
            <select id="prog-chain" className={inputCls} value={chainId} onChange={(e) => setChainId(Number(e.target.value))}>
              <optgroup label="Mainnet">
                {CHAINS.filter((c) => !c.testnet).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.id}</option>
                ))}
              </optgroup>
              <optgroup label="Testnet">
                {CHAINS.filter((c) => c.testnet).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.id}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="prog-token">Token reward</label>
              <input id="prog-token" className={inputCls} value={token} onChange={(e) => setToken(e.target.value)} placeholder="ETH" />
            </div>
            <div>
              <label className={labelCls} htmlFor="prog-pool">Pool escrow</label>
              <input id="prog-pool" className={inputCls} type="number" min="0" step="any" value={pool} onChange={(e) => setPool(e.target.value)} />
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Tier reward (per severity)</legend>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="tier-critical">Critical</label>
                <input id="tier-critical" className={inputCls} type="number" min="0" step="any" value={critical} onChange={(e) => setCritical(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="tier-high">High</label>
                <input id="tier-high" className={inputCls} type="number" min="0" step="any" value={high} onChange={(e) => setHigh(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="tier-medium">Medium</label>
                <input id="tier-medium" className={inputCls} type="number" min="0" step="any" value={medium} onChange={(e) => setMedium(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="tier-low">Low</label>
                <input id="tier-low" className={inputCls} type="number" min="0" step="any" value={low} onChange={(e) => setLow(e.target.value)} />
              </div>
            </div>
          </fieldset>
          {notice && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
          )}
          <button type="submit" className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Buat Program
          </button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-3">
        {programs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada program. Buat program pertama dari formulir di samping.
          </p>
        )}
        {programs.map((p) => {
          const count = reports.filter((r) => r.programId === p.id).length;
          return (
            <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {p.name}{" "}
                  {p.demo && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Contoh
                    </span>
                  )}
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {chainLabel(p.chainId)}
                </span>
              </div>
              {p.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.description}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Pool</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">{formatAmount(p.pool)} {p.token}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Escrow terkunci</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">{formatAmount(p.escrowLocked)} {p.token}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Sudah dibayar</dt>
                  <dd className="mt-0.5 font-bold text-emerald-700">{formatAmount(p.totalPaid)} {p.token}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">Laporan</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">{count}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                Tier — Critical: {formatAmount(p.tiers.Critical)} · High: {formatAmount(p.tiers.High)} · Medium: {formatAmount(p.tiers.Medium)} · Low: {formatAmount(p.tiers.Low)} {p.token}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
