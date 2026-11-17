// Route status satu job scan.
// GET /api/scans/[id] — kembalikan job beserta temuannya (bila sudah selesai).

import { NextResponse } from "next/server";
import { isScanConfigured, getScanJob } from "../../../../lib/scanServer";
import type { ScanJob } from "../../../../lib/scans";

export interface ScanGetResponse {
  configured: boolean;
  job?: ScanJob;
  error?: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const job = await getScanJob(id);
    if (!job) {
      const res: ScanGetResponse = {
        configured: isScanConfigured(),
        error: "Job scan tidak ditemukan.",
      };
      return NextResponse.json(res, { status: 404 });
    }
    const res: ScanGetResponse = { configured: isScanConfigured(), job };
    return NextResponse.json(res);
  } catch {
    console.error("Gagal membaca job scan.");
    const res: ScanGetResponse = {
      configured: isScanConfigured(),
      error: "Gagal membaca job scan.",
    };
    return NextResponse.json(res, { status: 502 });
  }
}
