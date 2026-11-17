// Helper client untuk Live Feed. TIDAK PERNAH menyentuh kredensial KV di sini —
// KV hanya dibaca server-side di app/api/findings/route.ts dari environment variable.

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS, type LiveFeedResponse, type LiveFinding } from "./live";
import type { Finding } from "./types";

export interface PublishResult {
  ok: boolean;
  /** false bila KV belum dikonfigurasi (mode lokal). */
  configured: boolean;
  error?: string;
}

/** Cek satu kali apakah Live Feed dikonfigurasi (tanpa polling). */
export async function getLiveStatus(): Promise<{ configured: boolean }> {
  try {
    const res = await fetch("/api/findings", { cache: "no-store" });
    if (!res.ok) return { configured: false };
    const data = (await res.json()) as LiveFeedResponse;
    return { configured: data.configured === true };
  } catch {
    return { configured: false };
  }
}

/** Kirim satu temuan ke Live Feed. Dipanggil fire-and-forget oleh pemanggil. */
export async function publishFinding(finding: Finding): Promise<PublishResult> {
  try {
    const res = await fetch("/api/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finding),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      configured?: boolean;
      error?: string;
    };
    if (res.status === 503 || data.configured === false) {
      return { ok: false, configured: false };
    }
    if (!res.ok || data.ok !== true) {
      return {
        ok: false,
        configured: true,
        error: typeof data.error === "string" ? data.error : "Gagal sinkron.",
      };
    }
    return { ok: true, configured: true };
  } catch {
    return { ok: false, configured: true, error: "Tidak dapat menghubungi server." };
  }
}

export interface LiveFeedState {
  configured: boolean;
  feed: LiveFinding[];
  lastSyncedAt: string | null;
  error: string | null;
  refresh: () => void;
}

/** Polling Live Feed tiap POLL_MS, hanya saat tab terlihat dan perangkat online. */
export function useLiveFeed(): LiveFeedState {
  const [configured, setConfigured] = useState(false);
  const [feed, setFeed] = useState<LiveFinding[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const newestSyncedAtRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const fetchFeed = useCallback(async (delta: boolean) => {
    try {
      const since = delta ? newestSyncedAtRef.current : null;
      const url = since
        ? `/api/findings?since=${encodeURIComponent(since)}`
        : "/api/findings";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveFeedResponse;
      if (!mountedRef.current) return;
      setConfigured(data.configured === true);
      if (data.configured !== true) {
        setFeed([]);
        setLastSyncedAt(new Date().toISOString());
        setError(null);
        return;
      }
      const incoming = Array.isArray(data.findings) ? data.findings : [];
      setFeed((prev) => {
        const map = new Map<string, LiveFinding>(prev.map((f) => [f.id, f]));
        for (const f of incoming) {
          const existing = map.get(f.id);
          if (!existing || f.syncedAt >= existing.syncedAt) map.set(f.id, f);
        }
        const merged = [...map.values()]
          .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))
          .slice(0, 50);
        newestSyncedAtRef.current = merged[0]?.syncedAt ?? null;
        return merged;
      });
      setLastSyncedAt(new Date().toISOString());
      setError(null);
    } catch {
      if (mountedRef.current) {
        setError("Gagal memuat Live Feed — mencoba lagi otomatis.");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void fetchFeed(newestSyncedAtRef.current !== null);
    };
    void fetchFeed(false);
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchFeed(true);
    };
    const onOnline = () => void fetchFeed(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchFeed]);

  const refresh = useCallback(() => {
    void fetchFeed(false);
  }, [fetchFeed]);

  return { configured, feed, lastSyncedAt, error, refresh };
}
