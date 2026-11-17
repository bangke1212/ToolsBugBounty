import { useEffect, useMemo, useState } from "react";
import { TAXONOMY, VULN_CLASSES } from "../lib/taxonomy";
import { formatDate, targetLabel, FINDING_STATUS_FLOW, SEVERITIES } from "../lib/types";
import type { Finding, FindingStatus, Severity } from "../lib/types";
import type { HunterStore } from "../lib/store";
import { getLiveStatus, publishFinding } from "../lib/useLiveFeed";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

const STATUS_STYLE: Record<FindingStatus, string> = {
  Baru: "bg-sky-100 text-sky-800",
  Dikonfirmasi: "bg-emerald-100 text-emerald-800",
  Dilaporkan: "bg-blue-100 text-blue-800",
  Dibayar: "bg-violet-100 text-violet-800",
  Ditolak: "bg-red-100 text-red-800",
};

export default function Findings({ store }: { store: HunterStore }) {
  const {
    targets,
    findings,
    liveSync,
    addFinding,
    setFindingStatus,
    setFindingSync,
    sendFindingToPlatform,
  } = store;
  const [title, setTitle] = useState("");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [vulnClass, setVulnClass] = useState(VULN_CLASSES[0]);
  const [skillName, setSkillName] = useState("");
  const [severity, setSeverity] = useState<Severity>("High");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [notice, setNotice] = useState("");
  const [liveConfigured, setLiveConfigured] = useState(false);

  useEffect(() => {
    let alive = true;
    getLiveStatus().then((s) => {
      if (alive) setLiveConfigured(s.configured);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Kirim temuan ke Live Feed secara fire-and-forget: kegagalan tidak boleh
  // merusak simpan lokal. Status sinkron dicatat per temuan.
  async function publish(finding: Finding) {
    const res = await publishFinding(finding);
    setFindingSync(
      finding.id,
      res.ok ? "synced" : res.configured ? "failed" : "local"
    );
  }

  const skillOptions = useMemo(() => {
    const q = skillName.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    return TAXONOMY.filter((s) => s.name.includes(q)).slice(0, 8).map((s) => s.name);
  }, [skillName]);

  const visibleFindings = useMemo(
    () =>
      filterStatus === "Semua"
        ? findings
        : findings.filter((f) => f.status === filterStatus),
    [findings, filterStatus]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setNotice("Judul temuan wajib diisi.");
    if (!targetId) return setNotice("Pilih target dulu (tambah target bila belum ada).");
    if (!description.trim()) return setNotice("Deskripsi temuan wajib diisi.");
    const created = addFinding({
      title: title.trim(),
      targetId,
      vulnClass,
      skillName: skillName.trim() || undefined,
      severity,
      description: description.trim(),
      steps: steps.trim(),
    });
    // Auto-publish ke Live Feed (fire-and-forget, tidak memblokir UI).
    void publish(created);
    setTitle("");
    setDescription("");
    setSteps("");
    setSkillName("");
    setNotice("Temuan ditambahkan dengan status Baru.");
  }

  function handleStatus(finding: Finding, next: FindingStatus) {
    setFindingStatus(finding.id, next);
    if (next === "Dikonfirmasi" || next === "Dilaporkan") {
      // Status penting ikut dipublikasi ke Live Feed.
      void publish({ ...finding, status: next });
    } else {
      // Status lain tidak dipublikasi: lokal kini berbeda dari feed.
      setFindingSync(finding.id, "local");
    }
  }

  function handleSend(finding: Finding) {
    const res = sendFindingToPlatform(finding.id);
    setNotice(res.message);
    if (res.ok) {
      // Temuan kini berstatus Dilaporkan — publikasikan juga ke Live Feed.
      void publish({ ...finding, status: "Dilaporkan" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
      >
        <h2 className="text-lg font-bold text-slate-900">Tambah Temuan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Catat kerentanan yang kamu temukan pada target berizin. Tulis langkah pemeriksaan —
          tanpa payload exploit.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="fnd-title">Judul temuan</label>
            <input
              id="fnd-title"
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth: XSS tersimpan di kolom komentar"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="fnd-target">Target</label>
            <select id="fnd-target" className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {targets.length === 0 && <option value="">— Belum ada target —</option>}
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="fnd-class">Kelas kerentanan</label>
              <select id="fnd-class" className={inputCls} value={vulnClass} onChange={(e) => setVulnClass(e.target.value)}>
                {VULN_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="fnd-severity">Severity</label>
              <select id="fnd-severity" className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="fnd-skill">
              Skill terkait (opsional, dari taksonomi 191 skill)
            </label>
            <input
              id="fnd-skill"
              className={inputCls}
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="Ketik nama skill, cth: idor"
              list="finding-skill-suggestions"
            />
            <datalist id="finding-skill-suggestions">
              {skillOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls} htmlFor="fnd-desc">Deskripsi temuan</label>
            <textarea id="fnd-desc" className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan dampak dan kondisi terjadinya." />
          </div>
          <div>
            <label className={labelCls} htmlFor="fnd-steps">Langkah pemeriksaan (tanpa payload exploit)</label>
            <textarea id="fnd-steps" className={inputCls} rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Langkah 1, 2, 3 — cukup alur pemeriksaan." />
          </div>
          {notice && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{notice}</p>
          )}
          <button type="submit" className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Tambah Temuan
          </button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filter status:</span>
          {["Semua", "Baru", "Dikonfirmasi", "Dilaporkan", "Dibayar", "Ditolak"].map((s) => (
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
        {!liveConfigured && (
          <p className="text-xs text-slate-500">
            Live Feed belum dikonfigurasi — temuan tersimpan lokal di browser. Aktifkan lewat
            tab Pengaturan.
          </p>
        )}
        {visibleFindings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada temuan dengan status ini.
          </p>
        )}
        {visibleFindings.map((f) => {
          const target = targets.find((t) => t.id === f.targetId);
          const next = FINDING_STATUS_FLOW[f.status];
          return (
            <article key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {f.title}{" "}
                  {f.demo && (
                    <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Contoh
                    </span>
                  )}
                  {f.source === "nuclei" && (
                    <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                      Nuclei · Kandidat
                    </span>
                  )}
                </h3>
                <span className="flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const sync = liveSync[f.id] ?? "local";
                    if (sync === "synced") {
                      return (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Tersinkron
                        </span>
                      );
                    }
                    if (sync === "failed") {
                      return (
                        <>
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                            Gagal sinkron
                          </span>
                          <button
                            onClick={() => void publish(f)}
                            className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Coba lagi
                          </button>
                        </>
                      );
                    }
                    return (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Lokal saja
                      </span>
                    );
                  })()}
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[f.status]}`}>
                    {f.status}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {target ? target.name : "Target dihapus"} · {formatDate(f.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{f.vulnClass}</span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">{f.severity}</span>
                {f.skillName && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-mono text-blue-800">{f.skillName}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{f.description}</p>
              {f.steps && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-medium text-blue-700">Langkah pemeriksaan</summary>
                  <p className="mt-1 whitespace-pre-line text-slate-600">{f.steps}</p>
                </details>
              )}
              {target && (
                <p className="mt-2 text-xs text-slate-500">
                  Target: <span className="font-mono">{targetLabel(target)}</span>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {next.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(f, s)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {s === "Dikonfirmasi" ? "Konfirmasi Temuan" : s}
                  </button>
                ))}
                {f.status === "Dikonfirmasi" && (
                  <button
                    onClick={() => handleSend(f)}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Kirim ke Platform
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
