// Route antrean scan URL (Nuclei).
// POST /api/scans — buat job scan baru (perlu konfirmasi scope + URL lolos
// anti-SSRF). GET /api/scans — daftar job (terbaru dulu).
// Antrean tersimpan di Vercel KV bila terkonfigurasi, fallback memori proses
// bila tidak (mode lokal/dev). Pemindaian sungguhan TIDAK terjadi di sini:
// worker terpisah (worker/worker.mjs) yang menjalankan binary Nuclei.
// Catatan: tanpa `export const dynamic` — route tetap dinamis karena GET
// membaca `req.url` (data request), mengikuti pola app/api/findings/route.ts.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validateScanUrl } from "../../../lib/ssrf";
import {
  NUCLEI_SEVERITIES,
  SCAN_JOB_LIMIT,
  countFindings,
  emptyCounts,
  normalizeTags,
  type NucleiSeverity,
  type ScanJob,
} from "../../../lib/scans";
import { isScanConfigured, listScanJobs, saveScanJob } from "../../../lib/scanServer";

export interface ScanListResponse {
  configured: boolean;
  jobs: ScanJob[];
}

export interface ScanCreateResponse {
  ok: boolean;
  configured: boolean;
  job?: ScanJob;
  error?: string;
}

function isNucleiSeverityArray(v: unknown): v is NucleiSeverity[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (s) => typeof s === "string" && (NUCLEI_SEVERITIES as string[]).includes(s)
  );
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const limitRaw = Number(params.get("limit") ?? SCAN_JOB_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), SCAN_JOB_LIMIT)
    : SCAN_JOB_LIMIT;
  const status = params.get("status") ?? undefined;
  try {
    const jobs = await listScanJobs({ limit, status });
    const body: ScanListResponse = { configured: isScanConfigured(), jobs };
    return NextResponse.json(body);
  } catch {
    console.error("Gagal membaca daftar scan.");
    const body: ScanListResponse = { configured: isScanConfigured(), jobs: [] };
    return NextResponse.json(body, { status: 502 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Body JSON tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Body JSON tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }
  const v = body as Record<string, unknown>;

  // Scope wajib dikonfirmasi — pola yang sama seperti Target & Scope.
  if (v.scopeConfirmed !== true) {
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error:
        "Konfirmasi scope wajib dicentang: kamu menyatakan target milikmu sendiri atau punya program bug bounty.",
    };
    return NextResponse.json(res, { status: 400 });
  }

  const check = validateScanUrl(v.url);
  if (!check.ok || !check.url) {
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: check.error ?? "URL tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }

  let severities: NucleiSeverity[] = ["critical", "high", "medium"];
  if (v.severities !== undefined) {
    if (!isNucleiSeverityArray(v.severities)) {
      const res: ScanCreateResponse = {
        ok: false,
        configured: isScanConfigured(),
        error: "Severity tidak valid. Pilih dari: critical, high, medium, low, info.",
      };
      return NextResponse.json(res, { status: 400 });
    }
    severities = [...new Set(v.severities)];
  }

  const tags = normalizeTags(v.tags);
  if (tags === null) {
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Tag template tidak valid (huruf/angka/dash, maksimum 10 tag).",
    };
    return NextResponse.json(res, { status: 400 });
  }

  const job: ScanJob = {
    id: randomUUID(),
    url: check.url,
    severities,
    tags,
    status: "antri",
    createdAt: new Date().toISOString(),
    counts: emptyCounts(),
    findings: [],
  };

  try {
    await saveScanJob(job);
  } catch {
    console.error("Gagal menyimpan job scan.");
    const res: ScanCreateResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Gagal menyimpan job scan.",
    };
    return NextResponse.json(res, { status: 502 });
  }

  const res: ScanCreateResponse = {
    ok: true,
    configured: isScanConfigured(),
    job: { ...job, counts: countFindings(job.findings) },
  };
  return NextResponse.json(res, { status: 201 });
}
