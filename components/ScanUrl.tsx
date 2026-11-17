"use client";

import { useMemo, useState } from "react";
import { validateScanUrl } from "../lib/ssrf";
import {
  NUCLEI_SEVERITIES,
  NUCLEI_SEVERITY_LABEL,
  SCAN_STATUS_LABEL,
  buildNucleiCommand,
  countFindings,
  formatDuration,
  nucleiSeverityToFindingSeverity,
  templateToVulnClass,
  type NucleiSeverity,
  type ScanFinding,
  type ScanJob,
  type ScanStatus,
} from "../lib/scans";
import { useScans } from "../lib/useScans";
import { formatDate } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none";
const btnPrimary =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_BADGE: Record<ScanStatus, string> = {
  antri: "bg-slate-100 text-slate-700",
  berjalan: "bg-blue-100 text-blue-800",
  selesai: "bg-emerald-100 text-emerald-800",
  gagal: "bg-red-100 text-red-800",
  "worker-belum-siap": "bg-amber-100 text-amber-800",
};

const SEVERITY_BADGE: Record<NucleiSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-800",
};

const DEFAULT_SEVERITIES: NucleiSeverity[] = ["critical", "high", "medium"];

function severityChips(job: ScanJob) {
  const c = job.counts.total > 0 ? job.counts : countFindings(job.findings);
  return (
    <span className="flex flex-wrap gap-1 text-xs">
      {(["critical", "high", "medium", "low", "info"] as NucleiSeverity[]).map((s) => (
        <span key={s} className={`rounded-full px-2 py-0.5 font-semibold ${SEVERITY_BADGE[s]}`}>
          {NUCLEI_SEVERITY_LABEL[s]} {c[s]}
        </span>
      ))}
    </span>
  );
}

export default function ScanUrl({ store }: { store: HunterStore }) {
  const { configured, jobs, error: pollError, createScan, refresh } = useScans();
  const { findings, addFinding, addTarget, targets } = store;

  const [url, setUrl] = useState("");
  const [severities, setSeverities] = useState<NucleiSeverity[]>(DEFAULT_SEVERITIES);
  const [tagsText, setTagsText] = useState("");
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [importedKeys, setImportedKeys] = useState<Record<string, boolean>>({});

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [tagsText]
  );

  const commandPreview = useMemo(() => {
    const check = validateScanUrl(url.trim() || "https://contoh.id");
    return buildNucleiCommand({
      url: check.ok && check.url ? check.url : url.trim() || "https://contoh.id",
      severities,
      tags,
    });
  }, [url, severities, tags]);

  const waitingJobs = jobs.filter((j) => j.status === "antri").length;
  const notReadyJob = jobs.find((j) => j.status === "worker-belum-siap");

  function toggleSeverity(s: NucleiSeverity) {
    setSeverities((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(commandPreview);
      setCopiedCmd(true);
      window.setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      setFormError("Gagal menyalin perintah — salin manual dari kotak perintah.");
    }
  }

  async function submitScan(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    const check = validateScanUrl(url);
    if (!check.ok || !check.url) {
      setFormError(check.error ?? "URL tidak valid.");
      return;
    }
    if (!scopeConfirmed) {
      setFormError(
        "Centang konfirmasi scope dulu: target milikmu sendiri atau punya program bug bounty."
      );
      return;
    }
    if (severities.length === 0) {
      setFormError("Pilih minimal satu severity.");
      return;
    }
    setSubmitting(true);
    const res = await createScan({
      url: check.url,
      severities,
      tags,
      scopeConfirmed: true,
    });
    setSubmitting(false);
    if (!res.ok || !res.job) {
      setFormError(res.error ?? "Gagal membuat job scan.");
      return;
    }
    setNotice(
      `Job scan dibuat (status: Antri). Jalankan worker Nuclei agar scan mulai berjalan.`
    );
    void refresh();
  }

  function importFinding(job: ScanJob, finding: ScanFinding) {
    const key = `${finding.templateId} @ ${finding.matchedUrl}`;
    const already = findings.some(
      (f) => f.templateId === finding.templateId && f.matchedUrl === finding.matchedUrl
    );
    if (already) {
      setImportedKeys((prev) => ({ ...prev, [key]: true }));
      return;
    }
    let target = targets.find((t) => t.kind === "web" && t.url === job.url);
    if (!target) {
      let hostname = job.url;
      try {
        hostname = new URL(job.url).hostname;
      } catch {
        // pakai URL apa adanya
      }
      target = addTarget({
        kind: "web",
        name: `Scan — ${hostname}`,
        url: job.url,
        scopeNote: "Target Scan URL (Nuclei) — scope dikonfirmasi saat membuat scan.",
        authorized: true,
      });
    }
    const refs =
      finding.references.length > 0
        ? `\n\nReferensi:\n${finding.references.map((r) => `- ${r}`).join("\n")}`
        : "";
    addFinding({
      title: finding.name,
      targetId: target.id,
      vulnClass: templateToVulnClass(finding.templateId, finding.name, finding.tags),
      severity: nucleiSeverityToFindingSeverity(finding.severity),
      description: `Kandidat — perlu verifikasi manual.\n\nTemplate Nuclei: ${finding.templateId}\nURL cocok: ${finding.matchedUrl}\nSeverity Nuclei: ${NUCLEI_SEVERITY_LABEL[finding.severity]}${finding.severity === "info" ? " (dipetakan ke Low di Temuan)" : ""}\nSumber: scan ${job.id} (${job.url})\n\n${finding.description}${refs}`,
      steps:
        "1. Buka URL yang cocok dan ulangi pemeriksaan secara manual di lingkungan berizin.\n2. Konfirmasi apakah temuan benar-benar dapat dieksploitasi.\n3. Bila terkonfirmasi, ubah status temuan ini menjadi Dikonfirmasi.",
      source: "nuclei",
      scanId: job.id,
      templateId: finding.templateId,
      matchedUrl: finding.matchedUrl,
    });
    setImportedKeys((prev) => ({ ...prev, [key]: true }));
    setNotice(`Temuan "${finding.name}" diimpor ke Temuan sebagai "Baru" (Kandidat).`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Scan URL (Nuclei)</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Ketik URL target berizin, antrean scan dibuat, lalu worker Nuclei yang kamu jalankan
          sendiri (laptop/VPS) memindai target dan mengirim hasilnya ke sini. Hasil scan adalah{" "}
          <strong className="text-slate-900">kandidat — perlu verifikasi manual</strong>, bukan
          bug terkonfirmasi. Tanpa worker, scan tetap berstatus Antri dan tidak menghasilkan
          temuan apa pun.
        </p>
        {!configured && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
            Mode lokal: antrean tersimpan di memori server ini. Di Vercel, pasang KV store agar
            antrean bertahan antar-restart (lihat README bagian &ldquo;Scan URL (Nuclei)&rdquo;).
          </p>
        )}
        {waitingJobs > 0 && (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900">
            Ada {waitingJobs} job berstatus Antri. Jalankan worker agar scan mulai:{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono">npm run worker</code> di
            laptop/server (lihat worker/README.md).
          </p>
        )}
        {notReadyJob?.error && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <strong>Worker belum siap:</strong> {notReadyJob.error}{" "}
            {notReadyJob.workerNote ? `(${notReadyJob.workerNote})` : ""}
          </p>
        )}
        {pollError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{pollError}</p>
        )}

        <form onSubmit={submitScan} className="mt-4 space-y-4">
          <div>
            <label htmlFor="scan-url" className="text-sm font-semibold text-slate-700">
              URL target
            </label>
            <input
              id="scan-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://staging.contohku.id"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`${inputCls} mt-1 font-mono`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Hanya http/https dan host publik. URL privat/internal (localhost, 192.168.x.x,
              10.x.x.x, metadata cloud) otomatis ditolak.
            </p>
          </div>

          <div>
            <span className="text-sm font-semibold text-slate-700">Severity</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {NUCLEI_SEVERITIES.map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    severities.includes(s)
                      ? "border-blue-700 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={severities.includes(s)}
                    onChange={() => toggleSeverity(s)}
                  />
                  {NUCLEI_SEVERITY_LABEL[s]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="scan-tags" className="text-sm font-semibold text-slate-700">
              Tag template (opsional)
            </label>
            <input
              id="scan-tags"
              type="text"
              autoComplete="off"
              placeholder="mis. cve, xss, misconfig"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className={`${inputCls} mt-1 font-mono`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Pisahkan dengan koma. Kosong = semua template default Nuclei.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={scopeConfirmed}
              onChange={(e) => setScopeConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-blue-700"
            />
            <span className="text-sm leading-relaxed text-slate-700">
              Saya menyatakan target ini milik saya sendiri atau memiliki program bug bounty yang
              mengizinkan pemindaian. Saya bertanggung jawab atas scan ini.
            </span>
          </label>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
          )}

          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Membuat job…" : "Buat Job Scan"}
          </button>
        </form>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              Perintah Nuclei yang setara (jalankan manual bila perlu)
            </p>
            <button type="button" onClick={copyCommand} className={btnSecondary}>
              {copiedCmd ? "Tersalin ✓" : "Salin"}
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-slate-100">
            {commandPreview}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Riwayat Scan</h2>
          <button type="button" onClick={refresh} className={btnSecondary}>
            Muat Ulang
          </button>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Belum ada scan. Buat job scan di atas untuk memulai.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {jobs.map((job) => {
              const expanded = expandedJobId === job.id;
              return (
                <li key={job.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold break-all text-slate-900">
                        {job.url}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(job.createdAt)}
                        {job.durationMs !== undefined && ` · Durasi ${formatDuration(job.durationMs)}`}
                        {job.severities.length > 0 &&
                          ` · ${job.severities.map((s) => NUCLEI_SEVERITY_LABEL[s]).join(", ")}`}
                        {job.tags.length > 0 && ` · tag: ${job.tags.join(", ")}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[job.status]}`}
                    >
                      {SCAN_STATUS_LABEL[job.status]}
                    </span>
                  </div>
                  <div className="mt-2">{severityChips(job)}</div>
                  {job.error && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
                      {job.error}
                    </p>
                  )}
                  {job.workerNote && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      {job.workerNote}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedJobId(expanded ? null : job.id)}
                    className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {expanded
                      ? "Sembunyikan temuan"
                      : `Lihat temuan (${job.findings.length})`}
                  </button>
                  {expanded && (
                    <div className="mt-3">
                      {job.findings.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {job.status === "selesai"
                            ? "Scan selesai tanpa temuan pada severity yang dipilih — bukan bukti target aman."
                            : "Belum ada temuan untuk job ini."}
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-xs text-slate-500">
                                <th className="py-2 pr-2 font-semibold">Severity</th>
                                <th className="py-2 pr-2 font-semibold">Template</th>
                                <th className="py-2 pr-2 font-semibold">Temuan</th>
                                <th className="py-2 pr-2 font-semibold">URL cocok</th>
                                <th className="py-2 font-semibold">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {job.findings.map((f) => {
                                const key = `${f.templateId} @ ${f.matchedUrl}`;
                                const imported =
                                  importedKeys[key] ||
                                  findings.some(
                                    (x) =>
                                      x.templateId === f.templateId &&
                                      x.matchedUrl === f.matchedUrl
                                  );
                                return (
                                  <tr key={f.id} className="border-b border-slate-100 align-top">
                                    <td className="py-2 pr-2">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEVERITY_BADGE[f.severity]}`}
                                      >
                                        {NUCLEI_SEVERITY_LABEL[f.severity]}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-2 font-mono text-xs break-all text-slate-600">
                                      {f.templateId}
                                    </td>
                                    <td className="py-2 pr-2">
                                      <p className="font-semibold text-slate-900">{f.name}</p>
                                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                        {f.description || "—"}
                                      </p>
                                      {f.references.length > 0 && (
                                        <p className="mt-1 text-xs">
                                          {f.references.slice(0, 2).map((r) => (
                                            <a
                                              key={r}
                                              href={r}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="mr-2 break-all text-blue-700 hover:underline"
                                            >
                                              Referensi
                                            </a>
                                          ))}
                                        </p>
                                      )}
                                      <p className="mt-1 text-[11px] font-semibold text-amber-700">
                                        Kandidat — perlu verifikasi manual
                                      </p>
                                    </td>
                                    <td className="py-2 pr-2 font-mono text-xs break-all text-slate-600">
                                      {f.matchedUrl}
                                    </td>
                                    <td className="py-2">
                                      <button
                                        type="button"
                                        disabled={imported}
                                        onClick={() => importFinding(job, f)}
                                        className={btnSecondary}
                                      >
                                        {imported ? "Sudah diimpor" : "Impor ke Temuan"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
