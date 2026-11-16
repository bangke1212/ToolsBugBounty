import { useMemo, useState } from "react";
import { DOMAIN_LABELS, TAXONOMY } from "../lib/taxonomy";

const DIFF_STYLE: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-800",
  basic: "bg-emerald-100 text-emerald-800",
  intermediate: "bg-sky-100 text-sky-800",
  advanced: "bg-amber-100 text-amber-800",
  expert: "bg-red-100 text-red-800",
};

export default function TaxonomyBrowser() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("Semua");
  const [difficulty, setDifficulty] = useState("Semua");

  const domains = useMemo(() => {
    const set = new Set(TAXONOMY.map((s) => s.domain));
    return ["Semua", ...[...set].sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TAXONOMY.filter((s) => {
      if (domain !== "Semua" && s.domain !== domain) return false;
      if (difficulty !== "Semua" && s.difficulty !== difficulty) return false;
      if (q && !s.name.includes(q)) return false;
      return true;
    });
  }, [query, domain, difficulty]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Taksonomi 191 Skill</h2>
      <p className="mt-1 text-sm text-slate-600">
        Katalog ringkas dari repo akashrpatil/awesome-offensive-security-skills (CyberSkills Elite,
        Apache-2.0). Dipakai sebagai referensi kelas kerentanan saat mengirim laporan. Hanya nama,
        domain, dan difficulty yang disimpan — tanpa deskripsi dan tanpa payload.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama skill, cth: ssrf, jwt, idor…"
          aria-label="Cari skill"
        />
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          aria-label="Filter domain"
        >
          {domains.map((d) => (
            <option key={d} value={d}>{d === "Semua" ? "Semua domain" : DOMAIN_LABELS[d] ?? d}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Filter difficulty"
        >
          {["Semua", "beginner", "basic", "intermediate", "advanced", "expert"].map((d) => (
            <option key={d} value={d}>{d === "Semua" ? "Semua difficulty" : d}</option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Menampilkan {filtered.length} dari {TAXONOMY.length} skill.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 60).map((s) => (
          <li key={s.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block font-mono text-xs font-semibold break-all text-slate-900">{s.name}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                {DOMAIN_LABELS[s.domain] ?? s.domain}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFF_STYLE[s.difficulty] ?? "bg-slate-200 text-slate-700"}`}>
                {s.difficulty}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {filtered.length > 60 && (
        <p className="mt-3 text-xs text-slate-500">
          Hanya 60 pertama yang ditampilkan — persempit pencarian untuk melihat sisanya.
        </p>
      )}
    </div>
  );
}
