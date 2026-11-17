// Live Feed (Vercel KV saja): tipe bersama + konstanta untuk sinkronisasi temuan.
// Feed bersama HANYA berisi temuan yang hunter simpan/konfirmasi — bukan deteksi
// otomatis. Tanpa KV yang dikonfigurasi, aplikasi tetap jalan mode lokal.

import type { Finding, FindingStatus, Severity } from "./types";
import { FINDING_STATUSES, SEVERITIES } from "./types";

/** Interval polling Live Feed (satu tempat, mudah diubah). */
export const POLL_MS = 5000;

/** Key daftar ID temuan di KV (LPUSH + LTRIM). */
export const LIVE_FEED_KEY = "live:findings:feed";
/** Maksimum entri di daftar feed KV. */
export const LIVE_FEED_MAX = 200;
/** Maksimum temuan yang dikembalikan GET /api/findings. */
export const LIVE_FEED_LIMIT = 50;

/** Key satu temuan di KV. */
export function liveFindingKey(id: string): string {
  return `live:finding:${id}`;
}

/** Status sinkronisasi satu temuan lokal terhadap Live Feed. */
export type SyncState = "synced" | "local" | "failed";

export interface LiveFinding extends Finding {
  /** Waktu temuan (di)publikasi ke feed, ISO 8601. */
  syncedAt: string;
}

export interface LiveStatus {
  configured: boolean;
}

export interface LiveFeedResponse extends LiveStatus {
  findings: LiveFinding[];
}

export interface LivePublishResponse extends LiveStatus {
  ok: boolean;
  finding?: LiveFinding;
  error?: string;
}

// ---------------------------------------------------------------------------
// Validasi payload temuan (dipakai route server-side).
// ---------------------------------------------------------------------------

const MAX_TITLE = 200;
const MAX_TEXT = 5000;
const MAX_SHORT = 200;

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return Number.isFinite(Date.parse(v));
}

/** Validasi + normalisasi payload tak tepercaya menjadi Finding, atau null bila tidak valid. */
export function parseFinding(value: unknown): Finding | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isNonEmptyString(v.id, MAX_SHORT)) return null;
  if (!isNonEmptyString(v.title, MAX_TITLE)) return null;
  if (!isNonEmptyString(v.targetId, MAX_SHORT)) return null;
  if (!isNonEmptyString(v.vulnClass, 80)) return null;
  if (typeof v.severity !== "string" || !SEVERITIES.includes(v.severity as Severity)) return null;
  if (!isNonEmptyString(v.description, MAX_TEXT)) return null;
  if (typeof v.steps !== "string" || v.steps.length > MAX_TEXT) return null;
  if (typeof v.status !== "string" || !FINDING_STATUSES.includes(v.status as FindingStatus)) return null;
  if (!isIsoDate(v.createdAt)) return null;
  if (v.skillName !== undefined && (typeof v.skillName !== "string" || v.skillName.length > 120)) return null;
  if (v.demo !== undefined && typeof v.demo !== "boolean") return null;
  return {
    id: (v.id as string).trim(),
    title: (v.title as string).trim(),
    targetId: (v.targetId as string).trim(),
    vulnClass: (v.vulnClass as string).trim(),
    skillName:
      typeof v.skillName === "string" && v.skillName.trim() ? v.skillName.trim() : undefined,
    severity: v.severity as Severity,
    description: (v.description as string).trim(),
    steps: (v.steps as string).trim(),
    status: v.status as FindingStatus,
    demo: v.demo === true ? true : undefined,
    createdAt: v.createdAt as string,
  };
}

/** Validasi objek LiveFinding yang dibaca dari KV (tahan terhadap data lama/rusak). */
export function parseLiveFinding(value: unknown): LiveFinding | null {
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  const finding = parseFinding(candidate);
  if (!finding) return null;
  if (typeof candidate !== "object" || candidate === null) return null;
  const syncedAt = (candidate as Record<string, unknown>).syncedAt;
  if (!isIsoDate(syncedAt)) return null;
  return { ...finding, syncedAt: syncedAt as string };
}

export function toLiveFinding(finding: Finding): LiveFinding {
  return { ...finding, syncedAt: new Date().toISOString() };
}
