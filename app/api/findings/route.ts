import { NextResponse } from "next/server";
import {
  LIVE_FEED_KEY,
  LIVE_FEED_LIMIT,
  LIVE_FEED_MAX,
  liveFindingKey,
  parseFinding,
  parseLiveFinding,
  toLiveFinding,
  type LiveFeedResponse,
  type LiveFinding,
  type LivePublishResponse,
} from "../../../lib/live";

// Route server-side untuk Live Feed (Vercel KV / Redis milik Vercel).
// Kredensial KV HANYA dibaca dari environment variable server-side:
//   KV_REST_API_URL dan KV_REST_API_TOKEN (ter-inject otomatis saat KV store
//   di-attach ke project Vercel). Tanpa keduanya, route tetap menjawab 200
//   dengan configured:false — aplikasi jalan mode lokal, bukan error.
// Detail error KV tidak pernah dikirim ke client (bisa berisi URL/token).
// Catatan: tanpa `export const dynamic` — dengan Cache Components aktif,
// route ini tetap dinamis karena GET membaca `req.url` (data request) dan
// mengakses KV; prerendering berhenti di situ sesuai docs Next.js.

function isLiveConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function GET(req: Request) {
  if (!isLiveConfigured()) {
    const body: LiveFeedResponse = { configured: false, findings: [] };
    return NextResponse.json(body);
  }
  try {
    // Import dinamis setelah cek env: menyentuh client kv tanpa env var
    // akan melempar error dari paket @vercel/kv.
    const { kv } = await import("@vercel/kv");
    const since = new URL(req.url).searchParams.get("since");
    const sinceMs = since ? Date.parse(since) : NaN;

    const ids = (await kv.lrange<string>(LIVE_FEED_KEY, 0, LIVE_FEED_LIMIT - 1)) ?? [];
    const uniqueIds = [...new Set(ids)].filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );

    let findings: LiveFinding[] = [];
    if (uniqueIds.length > 0) {
      const values = (await kv.mget(
        ...uniqueIds.map((id) => liveFindingKey(id))
      )) as unknown[];
      findings = (values ?? [])
        .map((v) => parseLiveFinding(v))
        .filter((f): f is LiveFinding => f !== null);
    }
    findings.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
    if (Number.isFinite(sinceMs)) {
      findings = findings.filter((f) => Date.parse(f.syncedAt) > sinceMs);
    }

    const body: LiveFeedResponse = {
      configured: true,
      findings: findings.slice(0, LIVE_FEED_LIMIT),
    };
    return NextResponse.json(body);
  } catch {
    console.error("Live Feed GET gagal.");
    const body: LiveFeedResponse = { configured: true, findings: [] };
    return NextResponse.json(body, { status: 502 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const res: LivePublishResponse = {
      ok: false,
      configured: isLiveConfigured(),
      error: "Body JSON tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }

  const finding = parseFinding(body);
  if (!finding) {
    const res: LivePublishResponse = {
      ok: false,
      configured: isLiveConfigured(),
      error: "Payload temuan tidak valid.",
    };
    return NextResponse.json(res, { status: 400 });
  }

  if (!isLiveConfigured()) {
    const res: LivePublishResponse = {
      ok: false,
      configured: false,
      error: "Live feed belum dikonfigurasi. Buat KV store di Vercel lalu redeploy.",
    };
    return NextResponse.json(res, { status: 503 });
  }

  const live = toLiveFinding(finding);
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(liveFindingKey(live.id), live);
    await kv.lpush(LIVE_FEED_KEY, live.id);
    await kv.ltrim(LIVE_FEED_KEY, 0, LIVE_FEED_MAX - 1);
    const res: LivePublishResponse = { ok: true, configured: true, finding: live };
    return NextResponse.json(res);
  } catch {
    console.error("Live Feed POST gagal.");
    const res: LivePublishResponse = {
      ok: false,
      configured: true,
      error: "Gagal menyimpan temuan ke Live Feed.",
    };
    return NextResponse.json(res, { status: 502 });
  }
}
