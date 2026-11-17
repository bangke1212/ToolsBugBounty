// Scan URL (Nuclei): tipe bersama, konstanta KV, dan validasi payload.
// Dipakai client (form + daftar scan) dan server (route API + worker).
// Hasil scan Nuclei SELALU diperlakukan sebagai kandidat — bukan bug
// terkonfirmasi — sampai hunter memverifikasinya secara manual.

import type { Severity } from "./types";

export type ScanStatus = "antri" | "berjalan" | "selesai" | "gagal" | "worker-belum-siap";

export const SCAN_STATUSES: ScanStatus[] = [
  "antri",
  "berjalan",
  "selesai",
  "gagal",
  "worker-belum-siap",
];

export const SCAN_STATUS_LABEL: Record<ScanStatus, string> = {
  antri: "Antri",
  berjalan: "Berjalan",
  selesai: "Selesai",
  gagal: "Gagal",
  "worker-belum-siap": "Worker belum siap",
};

/** Status akhir: scan tidak lagi berubah setelah ini. */
export function isScanTerminal(status: ScanStatus): boolean {
  return status === "selesai" || status === "gagal" || status === "worker-belum-siap";
}

export type NucleiSeverity = "critical" | "high" | "medium" | "low" | "info";

export const NUCLEI_SEVERITIES: NucleiSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const NUCLEI_SEVERITY_LABEL: Record<NucleiSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/** Severity Nuclei → Severity Temuan (tipe Severity tidak punya Info). */
export function nucleiSeverityToFindingSeverity(s: NucleiSeverity): Severity {
  switch (s) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

/** Satu temuan kandidat dari output JSONL Nuclei. */
export interface ScanFinding {
  id: string;
  templateId: string;
  name: string;
  severity: NucleiSeverity;
  matchedUrl: string;
  description: string;
  references: string[];
  tags: string[];
}

export interface ScanCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export function emptyCounts(): ScanCounts {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
}

export function countFindings(findings: ScanFinding[]): ScanCounts {
  const counts = emptyCounts();
  for (const f of findings) {
    counts[f.severity] += 1;
    counts.total += 1;
  }
  return counts;
}

export interface ScanJob {
  id: string;
  url: string;
  severities: NucleiSeverity[];
  tags: string[];
  status: ScanStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  counts: ScanCounts;
  findings: ScanFinding[];
  /** Pesan error (status gagal) atau instruksi (status worker-belum-siap). */
  error?: string;
  workerNote?: string;
}

/** Key antrean job scan di KV (LPUSH + LTRIM). */
export const SCAN_QUEUE_KEY = "scans:queue";
/** Maksimum entri di antrean KV. */
export const SCAN_QUEUE_MAX = 200;
/** Maksimum job yang dikembalikan GET /api/scans. */
export const SCAN_JOB_LIMIT = 50;
/** Maksimum temuan yang disimpan per job. */
export const SCAN_FINDINGS_MAX = 500;

export function scanJobKey(id: string): string {
  return `scan:${id}`;
}

// ---------------------------------------------------------------------------
// Validasi payload tak tepercaya (dipakai route server-side).
// ---------------------------------------------------------------------------

const MAX_URL = 2048;
const MAX_SHORT = 200;
const MAX_TEXT = 5000;

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return Number.isFinite(Date.parse(v));
}

function isNucleiSeverity(v: unknown): v is NucleiSeverity {
  return typeof v === "string" && (NUCLEI_SEVERITIES as string[]).includes(v);
}

function parseStringArray(v: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length > maxItems) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string" || item.length > maxLen) return null;
    out.push(item);
  }
  return out;
}

/** Validasi + normalisasi satu temuan kandidat, atau null bila tidak valid. */
export function parseScanFinding(value: unknown): ScanFinding | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.id, MAX_SHORT)) return null;
  if (!isNonEmptyString(v.templateId, MAX_SHORT)) return null;
  if (!isNonEmptyString(v.name, MAX_SHORT)) return null;
  if (!isNucleiSeverity(v.severity)) return null;
  if (!isNonEmptyString(v.matchedUrl, MAX_URL)) return null;
  if (typeof v.description !== "string" || v.description.length > MAX_TEXT) return null;
  const references = parseStringArray(v.references ?? [], 10, 500);
  if (references === null) return null;
  const tags = parseStringArray(v.tags ?? [], 20, 80);
  if (tags === null) return null;
  return {
    id: (v.id as string).trim(),
    templateId: (v.templateId as string).trim(),
    name: (v.name as string).trim(),
    severity: v.severity as NucleiSeverity,
    matchedUrl: (v.matchedUrl as string).trim(),
    description: (v.description as string).trim(),
    references,
    tags,
  };
}

function parseScanCounts(v: unknown): ScanCounts | null {
  if (typeof v !== "object" || v === null) return null;
  const c = v as Record<string, unknown>;
  const keys = ["critical", "high", "medium", "low", "info", "total"] as const;
  const out = emptyCounts();
  for (const k of keys) {
    if (typeof c[k] !== "number" || !Number.isFinite(c[k]) || c[k] < 0) return null;
    out[k] = Math.floor(c[k] as number);
  }
  return out;
}

/** Validasi objek ScanJob yang dibaca dari KV/memori (tahan data lama/rusak). */
export function parseScanJob(value: unknown): ScanJob | null {
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (typeof candidate !== "object" || candidate === null) return null;
  const v = candidate as Record<string, unknown>;
  if (!isNonEmptyString(v.id, MAX_SHORT)) return null;
  if (!isNonEmptyString(v.url, MAX_URL)) return null;
  if (!Array.isArray(v.severities) || v.severities.length === 0) return null;
  const severities: NucleiSeverity[] = [];
  for (const s of v.severities as unknown[]) {
    if (!isNucleiSeverity(s)) return null;
    severities.push(s);
  }
  const tags = parseStringArray(v.tags ?? [], 10, 60);
  if (tags === null) return null;
  if (typeof v.status !== "string" || !(SCAN_STATUSES as string[]).includes(v.status)) return null;
  if (!isIsoDate(v.createdAt)) return null;
  if (v.startedAt !== undefined && !isIsoDate(v.startedAt)) return null;
  if (v.finishedAt !== undefined && !isIsoDate(v.finishedAt)) return null;
  if (v.durationMs !== undefined && (typeof v.durationMs !== "number" || v.durationMs < 0)) return null;
  const counts = parseScanCounts(v.counts);
  if (!counts) return null;
  if (!Array.isArray(v.findings)) return null;
  const findings: ScanFinding[] = [];
  for (const f of (v.findings as unknown[]).slice(0, SCAN_FINDINGS_MAX)) {
    const parsed = parseScanFinding(f);
    if (parsed) findings.push(parsed);
  }
  if (v.error !== undefined && (typeof v.error !== "string" || v.error.length > MAX_TEXT)) return null;
  if (v.workerNote !== undefined && (typeof v.workerNote !== "string" || v.workerNote.length > MAX_TEXT)) return null;
  return {
    id: (v.id as string).trim(),
    url: (v.url as string).trim(),
    severities,
    tags,
    status: v.status as ScanStatus,
    createdAt: v.createdAt as string,
    startedAt: typeof v.startedAt === "string" ? v.startedAt : undefined,
    finishedAt: typeof v.finishedAt === "string" ? v.finishedAt : undefined,
    durationMs: typeof v.durationMs === "number" ? v.durationMs : undefined,
    counts,
    findings,
    error: typeof v.error === "string" && v.error ? v.error : undefined,
    workerNote: typeof v.workerNote === "string" && v.workerNote ? v.workerNote : undefined,
  };
}

/** Normalisasi tag template dari input bebas (string "a, b" atau array). */
export function normalizeTags(input: unknown): string[] | null {
  let raw: string[];
  if (typeof input === "string") {
    raw = input.split(",");
  } else if (Array.isArray(input)) {
    raw = input as string[];
  } else if (input === undefined) {
    return [];
  } else {
    return null;
  }
  const tags: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") return null;
    const tag = t.trim().toLowerCase();
    if (!tag) continue;
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(tag)) return null;
    if (tag.length > 60) return null;
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > 10) return null;
  return tags;
}

/** Petakan template Nuclei ke kelas kerentanan taksonomi (untuk Temuan). */
export function templateToVulnClass(templateId: string, name: string, tags: string[]): string {
  const hay = `${templateId} ${name} ${tags.join(" ")}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/xss|cross-site-scripting/, "XSS"],
    [/sqli|sql-injection|sql injection/, "SQLi"],
    [/ssrf|server-side-request/, "SSRF"],
    [/idor|broken-access|insecure-direct/, "IDOR"],
    [/rce|remote-code|command-injection/, "RCE"],
    [/ssti|template-injection/, "SSTI"],
    [/xxe|xml-external/, "XXE"],
    [/lfi|path-traversal|directory-traversal|file-inclusion/, "LFI"],
    [/open-redirect/, "Open Redirect"],
    [/cors/, "CORS"],
    [/csrf/, "CSRF"],
    [/cve-/, "CVE"],
    [/misconfig|missing-security-header|exposed|disclosure|information/, "Misconfig"],
  ];
  for (const [re, label] of rules) {
    if (re.test(hay)) return label;
  }
  return "Lainnya";
}

// ---------------------------------------------------------------------------
// Perintah Nuclei (ditampilkan di UI agar hunter bisa menjalankan manual).
// ---------------------------------------------------------------------------

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Susun perintah nuclei yang setara dengan job ini (untuk dijalankan manual). */
export function buildNucleiCommand(input: {
  url: string;
  severities: NucleiSeverity[];
  tags: string[];
}): string {
  const parts = ["nuclei", "-u", shellQuote(input.url)];
  if (input.severities.length > 0) {
    parts.push("-severity", input.severities.join(","));
  }
  if (input.tags.length > 0) {
    parts.push("-tags", input.tags.join(","));
  }
  parts.push("-j", "-o", "hasil.jsonl");
  return parts.join(" ");
}

/** Format durasi milidetik menjadi teks ringkas (mis. "1 mnt 23 dtk"). */
export function formatDuration(ms?: number): string {
  if (ms === undefined || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} dtk`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m} mnt ${s} dtk`;
}
