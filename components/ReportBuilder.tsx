import { useMemo, useState } from "react";
import { targetLabel } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function ReportBuilder({ store }: { store: HunterStore }) {
  const { findings, targets } = store;
  const [title, setTitle] = useState("Laporan Bug Bounty — Hunter Command Center");
  const [programName, setProgramName] = useState("");
  const [selected, setSelected] = useState<string[]>(() =>
    findings.filter((f) => f.status === "Dikonfirmasi").map((f) => f.id)
  );
  const [notice, setNotice] = useState("");

  const chosen = useMemo(
    () => findings.filter((f) => selected.includes(f.id)),
    [findings, selected]
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const markdown = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    if (programName.trim()) lines.push(`Program: ${programName.trim()}`);
    lines.push(`Tanggal: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`);
    lines.push(`Jumlah temuan: ${chosen.length}`);
    lines.push("");
    lines.push("## Ringkasan");
    lines.push("");
    if (chosen.length === 0) {
      lines.push("Belum ada temuan yang dipilih.");
    } else {
      for (const f of chosen) {
        lines.push(`- **${f.title}** — ${f.vulnClass} · ${f.severity} · ${f.status}`);
      }
    }
    lines.push("");
    for (const f of chosen) {
      const target = targets.find((t) => t.id === f.targetId);
      lines.push(`## ${f.title}`);
      lines.push("");
      lines.push(`- Target: ${target ? `${target.name} (${targetLabel(target)})` : "-"}`);
      lines.push(`- Kelas kerentanan: ${f.vulnClass}`);
      lines.push(`- Severity: ${f.severity}`);
      lines.push(`- Status: ${f.status}`);
      if (f.skillName) lines.push(`- Skill terkait: ${f.skillName}`);
      lines.push("");
      lines.push("### Deskripsi");
      lines.push("");
      lines.push(f.description);
      lines.push("");
      if (f.steps) {
        lines.push("### Langkah pemeriksaan");
        lines.push("");
        lines.push(f.steps);
        lines.push("");
      }
    }
    lines.push("---");
    lines.push(
      "_Laporan ini disusun dari Hunter Command Center (simulasi). Semua temuan diuji hanya pada target berizin / masuk scope._"
    );
    return lines.join("\n");
  }, [title, programName, chosen, targets]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("Markdown laporan disalin ke clipboard.");
    } catch {
      setNotice("Gagal menyalin — salin manual dari kolom preview.");
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-bug-bounty.md";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("File laporan-bug-bounty.md diunduh.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Susun Laporan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pilih temuan yang sudah dikonfirmasi, lalu export sebagai Markdown.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelCls} htmlFor="rb-title">Judul laporan</label>
              <input id="rb-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="rb-program">Nama program (opsional)</label>
              <input
                id="rb-program"
                className={inputCls}
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="cth: Protokol Lending DeFi"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">Pilih temuan ({selected.length})</h3>
          {findings.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">Belum ada temuan. Tambahkan di tab Temuan.</p>
          )}
          <ul className="mt-3 space-y-2">
            {findings.map((f) => (
              <li key={f.id}>
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.id)}
                    onChange={() => toggle(f.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold text-slate-900">{f.title}</span>
                    <span className="block text-xs text-slate-500">
                      {f.vulnClass} · {f.severity} · {f.status}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {notice && (
            <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={copyMarkdown}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Salin Markdown
            </button>
            <button
              onClick={downloadMarkdown}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Unduh .md
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
        <h3 className="text-base font-bold text-slate-900">Preview Markdown</h3>
        <pre className="mt-3 max-h-[560px] overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-100">
          {markdown}
        </pre>
      </div>
    </div>
  );
}
