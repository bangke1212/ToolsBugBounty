import { useEffect, useState } from "react";
import { analyzeWithAi, getAiStatus } from "../lib/ai";
import type { AiStatus } from "../lib/ai";
import { guidanceFor } from "../lib/recon";
import { targetLabel } from "../lib/types";
import type { AiPromptKind } from "../lib/types";
import type { HunterStore } from "../lib/store";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

const KIND_LABELS: { id: AiPromptKind; label: string }[] = [
  { id: "analisis-temuan", label: "Analisis temuan" },
  { id: "recon-target", label: "Saran recon untuk target" },
  { id: "rantai-serangan", label: "Analisis rantai serangan" },
];

export default function AiAssist({ store }: { store: HunterStore }) {
  const { targets, findings, chains, logAiUsage } = store;
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [kind, setKind] = useState<AiPromptKind>("analisis-temuan");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerModel, setAnswerModel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getAiStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const subjects =
    kind === "analisis-temuan"
      ? findings.map((f) => ({ id: f.id, label: `${f.title} (${f.vulnClass} · ${f.severity})` }))
      : kind === "recon-target"
        ? targets.map((t) => ({ id: t.id, label: `${t.name} — ${targetLabel(t)}` }))
        : chains.map((c) => ({ id: c.id, label: c.name }));

  const selectedFinding = kind === "analisis-temuan" ? findings.find((f) => f.id === subjectId) : undefined;
  const selectedTarget = kind === "recon-target" ? targets.find((t) => t.id === subjectId) : undefined;
  const selectedChain = kind === "rantai-serangan" ? chains.find((c) => c.id === subjectId) : undefined;

  // Panduan manual sebagai fallback saat AI belum dikonfigurasi.
  const fallbackSteps: string[] = selectedFinding
    ? guidanceFor(selectedFinding.vulnClass)
    : selectedTarget
      ? [
          `Pastikan scope target ${selectedTarget.name} sudah dikonfirmasi berizin.`,
          "Jalankan checklist recon untuk target ini sampai selesai (tab Recon).",
          "Catat setiap observasi: header, cookie, teknologi, endpoint, dan parameter.",
          "Bila menemukan perilaku mencurigakan, catat sebagai temuan di tab Temuan.",
        ]
      : selectedChain
        ? [
            "Periksa ulang setiap langkah rantai: apakah tiap langkah benar-benar bisa terjadi?",
            "Cari langkah yang paling lemah — di situlah mitigasi paling efektif.",
            "Nilai dampak akhir dan tuliskan dalam laporan.",
          ]
        : [];

  async function runAnalysis() {
    setError("");
    setAnswer("");
    if (!subjectId) {
      setError("Pilih dulu temuan / target / rantai yang mau dianalisis.");
      return;
    }
    if (!status?.configured) {
      setError("AI belum dikonfigurasi — pakai panduan manual di bawah ini.");
      return;
    }
    const title =
      selectedFinding?.title ?? selectedTarget?.name ?? selectedChain?.name ?? "";
    const context = selectedFinding
      ? `Target: ${targets.find((t) => t.id === selectedFinding.targetId)?.name ?? "-"}\nKelas: ${selectedFinding.vulnClass}\nSeverity: ${selectedFinding.severity}\nDeskripsi: ${selectedFinding.description}\nLangkah pemeriksaan: ${selectedFinding.steps}`
      : selectedTarget
        ? `Jenis: ${selectedTarget.kind === "web" ? "Website" : "Smart Contract"}\nAlamat: ${targetLabel(selectedTarget)}\nScope: ${selectedTarget.scopeNote}\nTerkonfirmasi berizin: ${selectedTarget.authorized ? "ya" : "belum"}`
        : selectedChain
          ? `Rantai: ${selectedChain.name}\nLangkah: ${selectedChain.steps.map((s, i) => `${i + 1}. ${s.label}`).join(" → ")}\nDampak: ${selectedChain.impact}`
          : "";
    setLoading(true);
    try {
      const res = await analyzeWithAi({ kind, title, context });
      if (res.ok && res.answer) {
        setAnswer(res.answer);
        setAnswerModel(res.model);
        logAiUsage({
          model: res.model,
          kind,
          promptTokens: res.usage?.prompt_tokens,
          completionTokens: res.usage?.completion_tokens,
          totalTokens: res.usage?.total_tokens,
          ok: true,
        });
      } else {
        setError(res.error ?? "Analisis AI gagal.");
        logAiUsage({ model: res.model, kind, ok: false, note: res.error });
      }
    } catch {
      setError("Gagal menghubungi /api/ai. Coba lagi.");
      logAiUsage({ model: status?.model ?? "", kind, ok: false, note: "fetch /api/ai gagal" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-900">AI Assist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Minta model AI yang kamu konfigurasi untuk menganalisis temuan, target, atau rantai —
          dan menyarankan langkah pemeriksaan berikutnya.
        </p>

        {status === null && (
          <p className="mt-4 text-sm text-slate-500">Memeriksa status AI…</p>
        )}
        {status !== null && !status.configured && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>AI belum dikonfigurasi.</strong> Isi environment variable berikut, lalu
            restart aplikasi:
            <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
              <li>MODEL_API_BASE_URL=https://api.meta.ai/v1</li>
              <li>MODEL_API_KEY=(kunci API kamu)</li>
              <li>MODEL_API_MODEL=muse-spark-1.3</li>
            </ul>
            <p className="mt-2 font-sans text-xs">
              Lokal: salin <code>.env.example</code> menjadi <code>.env</code> dan isi nilainya.
              Vercel: Project Settings → Environment Variables. API key tidak pernah ditampilkan
              di UI ini dan tidak pernah dikirim ke browser.
            </p>
          </div>
        )}
        {status !== null && status.configured && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            AI aktif — model <strong className="font-mono">{status.model}</strong>
            <span className="block text-xs text-emerald-800">
              Setiap panggilan tercatat otomatis di tab Pengaturan (model, jenis prompt, token).
            </span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelCls} htmlFor="ai-kind">Jenis analisis</label>
            <select
              id="ai-kind"
              className={inputCls}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as AiPromptKind);
                setSubjectId("");
                setAnswer("");
                setError("");
              }}
            >
              {KIND_LABELS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ai-subject">
              {kind === "analisis-temuan" ? "Pilih temuan" : kind === "recon-target" ? "Pilih target" : "Pilih rantai"}
            </label>
            <select
              id="ai-subject"
              className={inputCls}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">— Pilih —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading || !status?.configured}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Menganalisis…" : "Minta Analisis AI"}
          </button>
          {!status?.configured && (
            <p className="text-xs text-slate-500">
              Tombol di atas aktif setelah AI dikonfigurasi. Sementara itu, panduan manual di
              samping tetap bisa dipakai.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {answer && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Hasil Analisis AI
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {answerModel}
              </span>
            </h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{answer}</p>
            <p className="mt-3 text-xs text-slate-500">
              Jawaban AI adalah saran pemeriksaan — verifikasi manual pada target berizin sebelum
              mencatatnya sebagai temuan.
            </p>
          </div>
        )}

        {fallbackSteps.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Panduan Manual Terpandu
              {!status?.configured && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Fallback (AI belum aktif)
                </span>
              )}
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              {fallbackSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {!answer && fallbackSteps.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Pilih jenis analisis dan subjeknya, lalu minta analisis AI — atau baca panduan manual
            yang muncul di sini.
          </p>
        )}
      </div>
    </div>
  );
}
