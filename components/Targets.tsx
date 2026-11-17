import { useState } from "react";
import { chainLabel } from "../lib/chains";
import { targetLabel } from "../lib/types";
import type { TargetKind } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function Targets({ store }: { store: HunterStore }) {
  const { targets, addTarget, setTargetAuthorized, removeTarget, chain } = store;
  const [kind, setKind] = useState<TargetKind>("web");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState<number>(11155111);
  const [scopeNote, setScopeNote] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [notice, setNotice] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setNotice("Nama target wajib diisi.");
    if (kind === "web" && !url.trim()) return setNotice("URL website wajib diisi.");
    if (kind === "contract" && !contractAddress.trim()) {
      return setNotice("Alamat kontrak wajib diisi.");
    }
    if (kind === "contract" && !/^0x[0-9a-fA-F]{40}$/.test(contractAddress.trim())) {
      return setNotice("Alamat kontrak harus format 0x + 40 karakter hex.");
    }
    addTarget({
      kind,
      name: name.trim(),
      url: kind === "web" ? url.trim() : undefined,
      contractAddress: kind === "contract" ? contractAddress.trim() : undefined,
      chainId: kind === "contract" ? chainId : undefined,
      scopeNote: scopeNote.trim(),
      authorized,
    });
    setName("");
    setUrl("");
    setContractAddress("");
    setScopeNote("");
    setAuthorized(false);
    setNotice("Target ditambahkan (simulasi).");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
      >
        <h2 className="text-lg font-bold text-slate-900">Tambah Target</h2>
        <p className="mt-1 text-sm text-slate-600">
          Daftarkan website atau kontrak yang masuk scope. Checklist recon hanya bisa dipakai
          setelah scope target dikonfirmasi berizin.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="tgt-kind">Jenis target</label>
            <select
              id="tgt-kind"
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as TargetKind)}
            >
              <option value="web">Website</option>
              <option value="contract">Smart Contract (blockchain)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="tgt-name">Nama target</label>
            <input
              id="tgt-name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Aplikasi Web Lab / Kontrak Lending"
            />
          </div>
          {kind === "web" ? (
            <div>
              <label className={labelCls} htmlFor="tgt-url">URL website</label>
              <input
                id="tgt-url"
                className={inputCls + " font-mono"}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="cth: https://web.contoh-dapp.id"
              />
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls} htmlFor="tgt-addr">Alamat kontrak</label>
                <input
                  id="tgt-addr"
                  className={inputCls + " font-mono"}
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="tgt-chain">Chain</label>
                <select
                  id="tgt-chain"
                  className={inputCls}
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                >
                  <option value={chain.id}>
                    {chain.name} · {chain.id} (chain aktif)
                  </option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Chain memakai chain aktif wallet simulasi. Ganti chain dari bar wallet di atas.
                </p>
              </div>
            </>
          )}
          <div>
            <label className={labelCls} htmlFor="tgt-scope">Catatan scope</label>
            <textarea
              id="tgt-scope"
              className={inputCls}
              rows={2}
              value={scopeNote}
              onChange={(e) => setScopeNote(e.target.value)}
              placeholder="cth: Hanya path /lab/* dan akun uji sendiri."
            />
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Scope sudah dikonfirmasi — target ini berizin untuk diuji (program bounty / lab
              resmi / izin tertulis).
            </span>
          </label>
          {notice && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Tambah Target
          </button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-3">
        {targets.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada target. Tambahkan target pertama dari form di samping.
          </p>
        )}
        {targets.map((t) => (
          <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {t.name}{" "}
                {t.demo && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Contoh
                  </span>
                )}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  t.authorized ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {t.authorized ? "Scope terkonfirmasi" : "Belum terkonfirmasi"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t.kind === "web" ? "Website" : `Smart Contract · ${t.chainId ? chainLabel(t.chainId) : ""}`}
            </p>
            <p className="mt-2 font-mono text-sm break-all text-slate-800">{targetLabel(t)}</p>
            {t.scopeNote && (
              <p className="mt-2 text-sm text-slate-600">Scope: {t.scopeNote}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setTargetAuthorized(t.id, !t.authorized)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.authorized ? "Cabut konfirmasi scope" : "Konfirmasi scope berizin"}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Hapus target ${t.name}?`)) removeTarget(t.id);
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Hapus
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
