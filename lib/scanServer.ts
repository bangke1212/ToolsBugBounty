// Penyimpanan job scan server-side. Pola yang sama seperti Live Feed
// (lib/live.ts): Vercel KV bila terkonfigurasi, fallback memori proses bila
// tidak (mode lokal/dev — antrean hilang saat server restart).
// File ini HANYA diimpor route API (server-side); jangan diimpor komponen.

import {
  SCAN_JOB_LIMIT,
  SCAN_QUEUE_KEY,
  SCAN_QUEUE_MAX,
  parseScanJob,
  scanJobKey,
  type ScanJob,
} from "./scans";

export function isScanConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Fallback lokal: antrean di memori proses (dev server saja).
const memoryJobs = new Map<string, ScanJob>();
const memoryOrder: string[] = [];

function memorySave(job: ScanJob): void {
  if (!memoryJobs.has(job.id)) memoryOrder.unshift(job.id);
  memoryJobs.set(job.id, job);
  while (memoryOrder.length > SCAN_QUEUE_MAX) {
    const old = memoryOrder.pop();
    if (old) memoryJobs.delete(old);
  }
}

async function kvSave(job: ScanJob): Promise<void> {
  // Import dinamis setelah cek env: menyentuh client kv tanpa env var
  // akan melempar error dari paket @vercel/kv.
  const { kv } = await import("@vercel/kv");
  await kv.set(scanJobKey(job.id), job);
  await kv.lpush(SCAN_QUEUE_KEY, job.id);
  await kv.ltrim(SCAN_QUEUE_KEY, 0, SCAN_QUEUE_MAX - 1);
}

/** Simpan job baru ke antrean (KV atau memori). */
export async function saveScanJob(job: ScanJob): Promise<void> {
  if (isScanConfigured()) {
    await kvSave(job);
  } else {
    memorySave(job);
  }
}

/** Perbarui job yang sudah ada (tanpa menambah antrean lagi). */
export async function updateScanJob(job: ScanJob): Promise<void> {
  if (isScanConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.set(scanJobKey(job.id), job);
  } else {
    memorySave(job);
  }
}

export async function getScanJob(id: string): Promise<ScanJob | null> {
  if (isScanConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      const raw = await kv.get(scanJobKey(id));
      return parseScanJob(raw);
    } catch {
      console.error("Gagal membaca job scan dari KV.");
      return null;
    }
  }
  const job = memoryJobs.get(id);
  return job ? parseScanJob(job) : null;
}

export interface ListScanJobsOptions {
  limit?: number;
  status?: string;
}

/** Daftar job scan, terbaru dulu. */
export async function listScanJobs(opts: ListScanJobsOptions = {}): Promise<ScanJob[]> {
  const limit = Math.min(Math.max(opts.limit ?? SCAN_JOB_LIMIT, 1), SCAN_JOB_LIMIT);
  if (isScanConfigured()) {
    try {
      const { kv } = await import("@vercel/kv");
      const ids = (await kv.lrange<string>(SCAN_QUEUE_KEY, 0, SCAN_QUEUE_MAX - 1)) ?? [];
      const uniqueIds = [...new Set(ids)].filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      if (uniqueIds.length === 0) return [];
      const values = (await kv.mget(...uniqueIds.map((id) => scanJobKey(id)))) as unknown[];
      const jobs = (values ?? [])
        .map((v) => parseScanJob(v))
        .filter((j): j is ScanJob => j !== null);
      jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const filtered = opts.status ? jobs.filter((j) => j.status === opts.status) : jobs;
      return filtered.slice(0, limit);
    } catch {
      console.error("Gagal membaca daftar job scan dari KV.");
      return [];
    }
  }
  const jobs = memoryOrder
    .map((id) => memoryJobs.get(id))
    .filter((j): j is ScanJob => j !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = opts.status ? jobs.filter((j) => j.status === opts.status) : jobs;
  return filtered.slice(0, limit);
}
