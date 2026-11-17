// Helper client untuk AI Assist. TIDAK PERNAH menyentuh API key di sini —
// key hanya dibaca server-side di app/api/ai/route.ts dari environment variable.

import type { AiPromptKind } from "./types";

export interface AiStatus {
  configured: boolean;
  model: string;
  baseUrl: string;
}

export interface AiAnalyzeRequest {
  kind: AiPromptKind;
  title: string;
  context: string;
}

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiAnalyzeResponse {
  ok: boolean;
  configured: boolean;
  model: string;
  answer?: string;
  usage?: AiUsage;
  error?: string;
}

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch("/api/ai", { cache: "no-store" });
    if (!res.ok) return { configured: false, model: "", baseUrl: "" };
    return (await res.json()) as AiStatus;
  } catch {
    return { configured: false, model: "", baseUrl: "" };
  }
}

export async function analyzeWithAi(req: AiAnalyzeRequest): Promise<AiAnalyzeResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return (await res.json()) as AiAnalyzeResponse;
}
