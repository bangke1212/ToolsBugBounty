// Callback worker scan.
// POST /api/scans/[id]/results — worker melaporkan perubahan status job:
//   "berjalan"         — worker mengambil job dari antrean (claim)
//   "selesai"          — scan selesai, sertakan findings (JSONL Nuclei)
//   "gagal"            — scan gagal, sertakan error
//   "worker-belum-siap"— binary Nuclei tidak terpasang, sertakan instruksi
// Autentikasi: bila env WORKER_TOKEN diisi, header Authorization Bearer atau
// x-worker-token wajib cocok (401 bila tidak). Bila WORKER_TOKEN kosong,
// callback diterima tanpa token — hanya untuk mode lokal/dev, JANGAN dipakai
// di deployment publik tanpa mengisi WORKER_TOKEN.
// Hasil scan SELALU disimpan apa adanya sebagai kandidat — verifikasi manual
// tetap kewajiban hunter, bukan server.

import { NextResponse } from "next/server";
import {
  SCAN_FINDINGS_MAX,
  SCAN_STATUSES,
  countFindings,
  parseScanFinding,
  type ScanFinding,
  type ScanJob,
  type ScanStatus,
} from "../../../../../lib/scans";
import { getScanJob, isScanConfigured, updateScanJob } from "../../../../../lib/scanServer";

export interface ScanResultsResponse {
  ok: boolean;
  configured: boolean;
  job?: ScanJob;
  error?: string;
}

function isWorkerAuthorized(req: Request): boolean {
  const token = process.env.WORKER_TOKEN ?? "";
  if (!token) return true; // Mode lokal/dev: WORKER_TOKEN belum diisi.
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${token}`) return true;
  const headerToken = req.headers.get("x-worker-token") ?? "";
  return headerToken === token;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isWorkerAuthorized(req)) {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Token worker tidak valid.",
    };
    return NextResponse.json(res, { status: 401 });
  }

  const { id } = await params;
  const job = await getScanJob(id);
  if (!job) {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Job scan tidak ditemukan.",
    };
    return NextResponse.json(res, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Body JSON tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Body JSON tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }
  const v = body as Record<string, unknown>;

  if (typeof v.status !== "string" || !(SCAN_STATUSES as string[]).includes(v.status)) {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Status tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }
  const status = v.status as ScanStatus;

  // Job yang sudah terminal tidak bisa diubah lagi.
  if (job.status === "selesai" || job.status === "gagal" || job.status === "worker-belum-siap") {
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      job,
      error: `Job sudah berstatus ${job.status} dan tidak bisa diubah.`,
    };
    return NextResponse.json(res, { status: 409 });
  }

  const now = new Date().toISOString();
  const next: ScanJob = { ...job, status };

  if (status === "berjalan") {
    if (!next.startedAt) next.startedAt = now;
  }

  if (status === "selesai" || status === "gagal" || status === "worker-belum-siap") {
    next.finishedAt = now;
    if (next.startedAt) {
      next.durationMs = Date.parse(now) - Date.parse(next.startedAt);
    } else if (typeof v.durationMs === "number" && v.durationMs >= 0) {
      next.durationMs = Math.floor(v.durationMs);
    }
  }

  if (status === "selesai") {
    if (!Array.isArray(v.findings)) {
      const res: ScanResultsResponse = {
        ok: false,
        configured: isScanConfigured(),
        error: "Status selesai wajib menyertakan findings (array, boleh kosong).",
      };
      return NextResponse.json(res, { status: 400 });
    }
    const findings: ScanFinding[] = [];
    for (const f of (v.findings as unknown[]).slice(0, SCAN_FINDINGS_MAX)) {
      const parsed = parseScanFinding(f);
      if (parsed) findings.push(parsed);
    }
    next.findings = findings;
    next.counts = countFindings(findings);
  }

  if (typeof v.error === "string" && v.error.trim()) {
    next.error = v.error.trim().slice(0, 5000);
  }
  if (typeof v.workerNote === "string" && v.workerNote.trim()) {
    next.workerNote = v.workerNote.trim().slice(0, 5000);
  }

  try {
    await updateScanJob(next);
  } catch {
    console.error("Gagal memperbarui job scan.");
    const res: ScanResultsResponse = {
      ok: false,
      configured: isScanConfigured(),
      error: "Gagal memperbarui job scan.",
    };
    return NextResponse.json(res, { status: 502 });
  }

  const res: ScanResultsResponse = { ok: true, configured: isScanConfigured(), job: next };
  return NextResponse.json(res);
}
