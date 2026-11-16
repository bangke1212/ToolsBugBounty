import { useMemo, useState } from "react";
import { TAXONOMY, VULN_CLASSES } from "../lib/taxonomy";
import { chainLabel } from "../lib/chains";
import { formatAmount, formatDate, shortAddress, SEVERITIES, STATUS_FLOW } from "../lib/types";
import type { ReportStatus, Severity } from "../lib/types";
import type { BugBountyStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

const STATUS_STYLE: Record<ReportStatus, string> = {
  Baru: "bg-sky-100 text-sky-800",
  Triase: "bg-amber-100 text-amber-800",
  Diterima: "bg-emerald-100 text-emerald-800",
  Ditolak: "bg-red-100 text-red-800",
  Duplikat: "bg-slate-200 text-slate-700",
  Dibayar: "bg-blue-100 text-blue-800",
};

export default function Reports({ store }: { store: BugBountyStore }) {
  const { programs, reports, wallet, createReport, setReportStatus, payReport } = store;
  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [vulnClass, setVulnClass] = useState(VULN_CLASSES[0]);
  const [skillName, setSkillName] = useState("");
  const [severity, setSeverity] = useState<Severity>("High");
  const [description, setDescription] = useState("");
  const [poc, setPoc] = useState("");
  const [target, setTarget] = useState("");
  const [hunter, setHunter] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [notice, setNotice] = useState("");

  const skillOptions = useMemo(() => {
    const q = skillName.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    return TAXONOMY.filter((s) => s.name.includes(q)).slice(0, 8).map((s) => s.name);
  }, [skillName]);

  const visibleReports = useMemo(
    () =>
      filterStatus === "Semua"
        ? reports
        : reports.filter((r) => r.status === filterStatus),
    [reports, filterStatus]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setNotice("Judul laporan wajib diisi.");
    if (!programId) return setNotice("Pilih program dulu (buat program bila belum ada).");
    if (!description.trim()) return setNotice("Deskripsi kerentanan wajib diisi.");
    if (!target.trim()) return setNotice("Target dalam scope wajib diisi.");
    const hunterAddr = (hunter.trim() || wallet || "").trim();
    if (!hunterAddr) {
      return setNotice("Hubungkan wallet simulasi atau isi alamat hunter secara manual.");
    }
    createReport({
      title: title.trim(),
      programId,
      vulnClass,
      skillName: skillName.trim() || undefined,
      severity,
      description: description.trim(),
      poc: poc.trim(),
      target: target.trim(),
      hunter: hunterAddr,
    });
    setTitle("");
    setDescription("");
    setPoc("");
    setTarget("");
    setSkillName("");
    setNotice("Laporan terkirim dengan status Baru (simulasi).");
  }

  function handlePay(reportId: string) {
    const res = payReport(reportId);
    setNotice(res.message);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
      >
        <h2 className="text-lg font-bold text-slate-900">Kirim Laporan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Hanya laporkan kerentanan pada target yang sudah memberi izin tertulis / masuk scope program.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="rep-title">Judul laporan</label>
            <input id="rep-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth: IDOR pada endpoint profil pengguna" />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-program">Program</label>
            <select id="rep-program" className={inputCls} value={programId} onChange={(e) => setProgramId(e.target.value)}>
              {programs.length === 0 && <option value="">— Belum ada program —</option>}
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rep-class">Kelas kerentanan</label>
              <select id="rep-class" className={inputCls} value={vulnClass} onChange={(e) => setVulnClass(e.target.value)}>
                {VULN_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="rep-severity">Severity</label>
              <select id="rep-severity" className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-skill">
              Skill terkait (opsional, dari taksonomi 191 skill)
            </label>
            <input
              id="rep-skill"
              className={inputCls}
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="Ketik nama skill, cth: idor"
              list="skill-suggestions"
            />
            <datalist id="skill-suggestions">
              {skillOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-target">Target dalam scope</label>
            <input id="rep-target" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="cth: api.proyek.id/users/{id}" />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-desc">Deskripsi kerentanan</label>
            <textarea id="rep-desc" className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan dampak dan kondisi terjadinya. Jangan sertakan payload exploit." />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-poc">Langkah reproduksi (tanpa payload exploit)</label>
            <textarea id="rep-poc" className={inputCls} rows={3} value={poc} onChange={(e) => setPoc(e.target.value)} placeholder="Langkah 1, 2, 3 — cukup alur reproduksi, tanpa perintah atau muatan berbahaya." />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-hunter">Alamat hunter</label>
            <input
              id="rep-hunter"
              className={inputCls + " font-mono"}
              value={hunter}
              onChange={(e) => setHunter(e.target.value)}
              placeholder={wallet ? wallet : "0x... (atau hubungkan wallet simulasi)"}
            />
            <p className="mt-1 text-xs text-slate-500">
              Kosongkan untuk memakai alamat wallet simulasi yang sedang terhubung.
            </p>
          </div>
          {notice && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
          )}
          <button type="submit" className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Kirim Laporan
          </button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filter status:</span>
          {["Semua", "Baru", "Triase", "Diterima", "Ditolak", "Duplikat", "Dibayar"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filterStatus === s
                  ? "bg-blue-700 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {visibleReports.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada laporan dengan status ini.
          </p>
        )}
        {visibleReports.map((r) => {
          const program = programs.find((p) => p.id === r.programId);
          const next = STATUS_FLOW[r.status];
          return (
            <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {r.title}{" "}
                  {r.demo && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Contoh
                    </span>
                  )}
                </h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {program ? program.name : "Program dihapus"} · {program ? chainLabel(program.chainId) : ""} · {formatDate(r.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{r.vulnClass}</span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{r.severity}</span>
                {r.skillName && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-blue-800">{r.skillName}</span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-slate-700">
                  Hunter {shortAddress(r.hunter)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{r.description}</p>
              {r.poc && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-medium text-blue-700">Langkah reproduksi</summary>
                  <p className="mt-1 whitespace-pre-line text-slate-600">{r.poc}</p>
                </details>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Target: <span className="font-mono">{r.target}</span>
                {r.paidAmount !== undefined && program && (
                  <> · Dibayar <strong className="text-emerald-700">{formatAmount(r.paidAmount)} {program.token}</strong></>
                )}
              </p>
              {next.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {next.map((s) =>
                    s === "Dibayar" ? (
                      <button
                        key={s}
                        onClick={() => handlePay(r.id)}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Bayar dari Escrow
                      </button>
                    ) : (
                      <button
                        key={s}
                        onClick={() => setReportStatus(r.id, s)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {s === "Triase" ? "Mulai Triase" : s === "Diterima" ? "Terima Laporan" : s}
                      </button>
                    )
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
