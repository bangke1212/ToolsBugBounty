// Helper client untuk antrean Scan URL. TIDAK PERNAH menyentuh WORKER_TOKEN
// di sini — token worker hanya dipakai server-side dan oleh worker terpisah.
// Job scan dicerminkan ke localStorage agar daftar tetap terlihat saat
// server mode lokal restart; server selalu menjadi sumber kebenaran.

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS } from "./live";
import {
  SCAN_JOB_LIMIT,
  type NucleiSeverity,
  type ScanJob,
} from "./scans";
import type { ScanListResponse } from "../app/api/scans/route";

export const SCAN_MIRROR_KEY = "bb-scans-v1";

export interface CreateScanInput {
  url: string;
  severities: NucleiSeverity[];
  tags: string[];
  scopeConfirmed: boolean;
}

export interface CreateScanResult {
  ok: boolean;
  job?: ScanJob;
  error?: string;
}

export interface ScansState {
  configured: boolean;
  jobs: ScanJob[];
  lastUpdatedAt: string | null;
  error: string | null;
  createScan: (input: CreateScanInput) => Promise<CreateScanResult>;
  refresh: () => void;
}

function readMirror(): ScanJob[] {
  try {
    const raw = window.localStorage.getItem(SCAN_MIRROR_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((j): j is ScanJob => typeof j === "object" && j !== null && typeof (j as ScanJob).id === "string");
  } catch {
    return [];
  }
}

function writeMirror(jobs: ScanJob[]): void {
  try {
    window.localStorage.setItem(SCAN_MIRROR_KEY, JSON.stringify(jobs.slice(0, SCAN_JOB_LIMIT)));
  } catch {
    // Penyimpanan penuh / tidak tersedia: abaikan.
  }
}

/** Polling antrean scan tiap POLL_MS, hanya saat tab terlihat dan online. */
export function useScans(): ScansState {
  const [configured, setConfigured] = useState(false);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/scans", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ScanListResponse;
      if (!mountedRef.current) return;
      setConfigured(data.configured === true);
      const incoming = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(incoming);
      writeMirror(incoming);
      setLastUpdatedAt(new Date().toISOString());
      setError(null);
    } catch {
      if (!mountedRef.current) return;
      // Server tidak terjangkau: tampilkan cermin lokal, jangan kosongkan.
      setJobs((prev) => (prev.length > 0 ? prev : readMirror()));
      setError("Tidak dapat menghubungi server — menampilkan antrean terakhir yang tersimpan.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setJobs(readMirror());
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void fetchJobs();
    };
    void fetchJobs();
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchJobs();
    };
    const onOnline = () => void fetchJobs();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchJobs]);

  const createScan = useCallback(
    async (input: CreateScanInput): Promise<CreateScanResult> => {
      try {
        const res = await fetch("/api/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          job?: ScanJob;
          error?: string;
        };
        if (!res.ok || data.ok !== true || !data.job) {
          return {
            ok: false,
            error: typeof data.error === "string" ? data.error : "Gagal membuat job scan.",
          };
        }
        setJobs((prev) => {
          const next = [data.job as ScanJob, ...prev.filter((j) => j.id !== data.job?.id)].slice(
            0,
            SCAN_JOB_LIMIT
          );
          writeMirror(next);
          return next;
        });
        return { ok: true, job: data.job };
      } catch {
        return { ok: false, error: "Tidak dapat menghubungi server." };
      }
    },
    []
  );

  const refresh = useCallback(() => {
    void fetchJobs();
  }, [fetchJobs]);

  return { configured, jobs, lastUpdatedAt, error, createScan, refresh };
}
