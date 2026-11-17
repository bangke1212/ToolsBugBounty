import { NextResponse } from "next/server";

// Route server-side untuk AI Assist.
// API key + model HANYA dibaca dari environment variable server-side:
//   MODEL_API_BASE_URL (default: https://api.meta.ai/v1)
//   MODEL_API_KEY      (wajib diisi agar AI aktif; tidak pernah dikembalikan ke client)
//   MODEL_API_MODEL    (default: muse-spark-1.3)
// Key tidak pernah di-log, tidak pernah dikirim ke client, dan tidak pernah
// ditulis ke file apa pun dari route ini.

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
const DEFAULT_MODEL = "muse-spark-1.3";

function getConfig() {
  const baseUrl = (process.env.MODEL_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const apiKey = process.env.MODEL_API_KEY || "";
  const model = process.env.MODEL_API_MODEL || DEFAULT_MODEL;
  return { baseUrl, apiKey, model, configured: apiKey.length > 0 };
}

export async function GET() {
  const { baseUrl, model, configured } = getConfig();
  return NextResponse.json({ configured, model, baseUrl });
}

const SYSTEM_PROMPT = [
  "Kamu adalah asisten keamanan untuk bug bounty (hunting kerentanan) pada website dan blockchain.",
  "Aturan: hanya beri saran pemeriksaan pada target yang SUDAH berizin / masuk scope.",
  "Jangan pernah membuat, menyarankan, atau menyertakan payload exploit, perintah berbahaya, atau langkah menyerang sistem tanpa izin.",
  "Jawab selalu dalam Bahasa Indonesia.",
  "Format jawaban: 1) Ringkasan singkat (1-2 kalimat). 2) Langkah pemeriksaan berikutnya (daftar bernomor, maksimal 7 langkah, berupa pengamatan dan pengujian manual). 3) Hal yang perlu diwaspadai (dampak dan batasan).",
  "Bila konteks tidak cukup, katakan apa informasi tambahan yang dibutuhkan, jangan mengarang temuan.",
].join("\n");

const KIND_LABEL: Record<string, string> = {
  "analisis-temuan": "Analisis temuan kerentanan",
  "recon-target": "Saran recon untuk target",
  "rantai-serangan": "Analisis rantai serangan",
};

export async function POST(req: Request) {
  const { baseUrl, apiKey, model, configured } = getConfig();
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        model,
        error:
          "AI belum dikonfigurasi. Isi MODEL_API_KEY (dan bila perlu MODEL_API_BASE_URL / MODEL_API_MODEL) lewat file .env untuk pengembangan lokal atau Environment Variables di Vercel.",
      },
      { status: 503 }
    );
  }

  let body: { kind?: unknown; title?: unknown; context?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, configured: true, model, error: "Body JSON tidak valid." },
      { status: 400 }
    );
  }

  const kind = typeof body.kind === "string" ? body.kind : "analisis-temuan";
  const title = typeof body.title === "string" ? body.title : "";
  const context = typeof body.context === "string" ? body.context : "";

  const userPrompt = [
    `Jenis analisis: ${KIND_LABEL[kind] ?? kind}`,
    `Judul: ${title}`,
    "Konteks (target / temuan / rantai, dari data pengguna):",
    context || "(tidak ada konteks tambahan)",
    "",
    "Berikan analisis sesuai format yang diminta.",
  ].join("\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          model,
          error: `Model mengembalikan status ${res.status}. Periksa kembali MODEL_API_KEY / MODEL_API_MODEL / MODEL_API_BASE_URL.${detail ? ` (${detail.slice(0, 160)})` : ""}`,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const answer = data?.choices?.[0]?.message?.content ?? "";
    if (!answer) {
      return NextResponse.json(
        { ok: false, configured: true, model, error: "Model tidak mengembalikan jawaban." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      model,
      answer,
      usage: data?.usage,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        model,
        error: "Gagal menghubungi model AI. Periksa MODEL_API_BASE_URL dan koneksi jaringan server.",
      },
      { status: 502 }
    );
  }
}
