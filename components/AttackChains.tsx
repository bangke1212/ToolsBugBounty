import { useState } from "react";
import { formatDate } from "../lib/types";
import type { ChainStep } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function AttackChains({ store }: { store: HunterStore }) {
  const { findings, chains, addChain, removeChain } = store;
  const [name, setName] = useState("");
  const [impact, setImpact] = useState("");
  const [steps, setSteps] = useState<ChainStep[]>([]);
  const [pickFinding, setPickFinding] = useState("");
  const [freeStep, setFreeStep] = useState("");
  const [notice, setNotice] = useState("");

  function addFindingStep() {
    const f = findings.find((x) => x.id === pickFinding);
    if (!f) return setNotice("Pilih temuan dulu untuk ditambahkan sebagai langkah.");
    setSteps((prev) => [...prev, { label: f.title, findingId: f.id }]);
    setPickFinding("");
  }

  function addFreeStep() {
    if (!freeStep.trim()) return setNotice("Tulis langkah manual dulu.");
    setSteps((prev) => [...prev, { label: freeStep.trim() }]);
    setFreeStep("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setNotice("Nama rantai wajib diisi.");
    if (steps.length < 1) return setNotice("Tambahkan minimal 1 langkah ke rantai.");
    if (!impact.trim()) return setNotice("Dampak akhir wajib diisi.");
    addChain(name.trim(), steps, impact.trim());
    setName("");
    setImpact("");
    setSteps([]);
    setNotice("Rantai serangan dibuat.");
  }

  function quickTemplate(kind: "xss-ato" | "ssrf-rce") {
    if (kind === "xss-ato") {
      const xss = findings.filter((f) => f.vulnClass === "XSS").slice(0, 2);
      if (xss.length < 1) return setNotice("Butuh minimal 1 temuan XSS untuk template ini.");
      const steps: ChainStep[] = xss.map((f) => ({ label: f.title, findingId: f.id }));
      steps.push({ label: "Pakai session korban untuk masuk sebagai korban" });
      addChain("XSS → Account Takeover", steps, "Pengambilalihan akun pengguna (Account Takeover).");
      setNotice("Rantai XSS → Account Takeover dibuat dari temuan yang ada.");
    } else {
      const ssrf = findings.find((f) => f.vulnClass === "SSRF");
      if (!ssrf) return setNotice("Butuh minimal 1 temuan SSRF untuk template ini.");
      addChain(
        "SSRF → Akses Metadata Cloud",
        [
          { label: ssrf.title, findingId: ssrf.id },
          { label: "Arahkan ke endpoint metadata cloud internal" },
        ],
        "Akses kredensial internal dan eskalasi ke eksekusi perintah."
      );
      setNotice("Rantai SSRF → Akses Metadata Cloud dibuat dari temuan yang ada.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-slate-900">Susun Rantai Serangan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Rangkai temuan menjadi rantai dampak: langkah awal → langkah berikut → dampak akhir.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelCls} htmlFor="chain-name">Nama rantai</label>
              <input
                id="chain-name"
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: XSS → Account Takeover"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="chain-pick">Tambah langkah dari temuan</label>
              <div className="flex gap-2">
                <select
                  id="chain-pick"
                  className={inputCls}
                  value={pickFinding}
                  onChange={(e) => setPickFinding(e.target.value)}
                >
                  <option value="">— Pilih temuan —</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.vulnClass} · {f.severity})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addFindingStep}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tambah
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="chain-free">Atau langkah manual</label>
              <div className="flex gap-2">
                <input
                  id="chain-free"
                  className={inputCls}
                  value={freeStep}
                  onChange={(e) => setFreeStep(e.target.value)}
                  placeholder="cth: Pakai session korban untuk masuk"
                />
                <button
                  type="button"
                  onClick={addFreeStep}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tambah
                </button>
              </div>
            </div>
            {steps.length > 0 && (
              <ol className="list-decimal space-y-1 rounded-lg bg-slate-50 p-4 pl-8 text-sm text-slate-700">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{s.label}</span>
                    <button
                      type="button"
                      onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs font-semibold text-red-700"
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div>
              <label className={labelCls} htmlFor="chain-impact">Dampak akhir</label>
              <input
                id="chain-impact"
                className={inputCls}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="cth: Pengambilalihan akun pengguna"
              />
            </div>
            {notice && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Simpan Rantai
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Template Cepat</h2>
          <p className="mt-1 text-sm text-slate-600">
            Buat rantai dari temuan yang sudah ada.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => quickTemplate("xss-ato")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              XSS → Account Takeover
            </button>
            <button
              onClick={() => quickTemplate("ssrf-rce")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              SSRF → Metadata Cloud
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {chains.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada rantai serangan. Susun rantai pertama dari form di samping.
          </p>
        )}
        {chains.map((c) => (
          <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {c.name}{" "}
                {c.demo && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Contoh
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  if (window.confirm(`Hapus rantai ${c.name}?`)) removeChain(c.id);
                }}
                className="text-xs font-semibold text-red-700"
              >
                Hapus
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatDate(c.createdAt)}</p>
            <ol className="mt-4 space-y-0">
              {c.steps.map((s, i) => {
                const f = s.findingId ? findings.find((x) => x.id === s.findingId) : undefined;
                return (
                  <li key={i}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="pb-1">
                        <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                        {f && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {f.vulnClass} · {f.severity} · {f.status}
                          </p>
                        )}
                      </div>
                    </div>
                    {i < c.steps.length - 1 && (
                      <div className="ml-3 flex h-5 items-center border-l-2 border-dashed border-blue-300 pl-4 text-blue-700">
                        ↓
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong>Dampak akhir:</strong> {c.impact}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
