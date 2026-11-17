// Worker Scan URL (Nuclei) — script Node.js tanpa dependensi.
// Dijalankan terpisah dari aplikasi Vercel karena Vercel (serverless) tidak
// bisa menjalankan binary scanner Nuclei (fungsi berumur pendek, tidak bisa
// menjalankan binary eksternal, scan butuh waktu menit).
//
// Cara jalan (di laptop/server):
//   APP_URL=http://localhost:3000 WORKER_TOKEN=<redacted> npm run worker
// Tanpa WORKER_TOKEN, worker hanya bisa dipakai bila server berjalan mode
// lokal/dev (server menolak callback tanpa token bila WORKER_TOKEN diisi).
//
// Alur: ambil job "antri" dari GET /api/scans → klaim (status "berjalan") →
// jalankan `nuclei -u <url> ... -j -o hasil.jsonl` → parse JSONL → kirim
// hasil ke POST /api/scans/[id]/results.
// Bila binary Nuclei TIDAK terpasang: laporkan "worker-belum-siap" dengan
// instruksi install — JANGAN PERNAH membuat temuan palsu.

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const WORKER_TOKEN = process.env.WORKER_TOKEN || "";
const NUCLEI_PATH = process.env.NUCLEI_PATH || "nuclei";
const POLL_MS = Number(process.env.POLL_MS || 5000);
const SCAN_TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT_MS || 10 * 60 * 1000);
const ONCE = process.argv.includes("--once");

const INSTALL_NOTE =
  "Install Nuclei dulu: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest " +
  "atau unduh rilis dari https://github.com/projectdiscovery/nuclei/releases, " +
  "lalu pastikan perintah `nuclei` ada di PATH (atau isi NUCLEI_PATH).";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("[worker] Berhenti (SIGINT)...");
});
process.on("SIGTERM", () => {
  stopping = true;
  console.log("[worker] Berhenti (SIGTERM)...");
});

function headers() {
  const h = { "Content-Type": "application/json" };
  if (WORKER_TOKEN) h["Authorization"] = `Bearer ${WORKER_TOKEN}`;
  return h;
}

async function api(path, options = {}) {
  const res = await fetch(`${APP_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function fetchQueuedJob() {
  const { status, data } = await api("/api/scans?status=antri&limit=50");
  if (status !== 200 || !Array.isArray(data.jobs)) {
    throw new Error(`GET /api/scans gagal (HTTP ${status}).`);
  }
  // Daftar terbaru dulu — ambil yang paling lama mengantre.
  const queued = data.jobs.filter((j) => j.status === "antri");
  return queued.length > 0 ? queued[queued.length - 1] : null;
}

async function reportResults(jobId, body) {
  const { status, data } = await api(`/api/scans/${jobId}/results`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (status !== 200 || data.ok !== true) {
    throw new Error(`POST results gagal (HTTP ${status}): ${data.error || "tanpa pesan"}`);
  }
  return data.job;
}

function runCommand(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: false, timeout: timeoutMs });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr, error: err.message, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, error: null, timedOut });
    });
  });
}

async function checkNuclei() {
  const res = await runCommand(NUCLEI_PATH, ["-version"], 15000);
  return res.code === 0;
}

function parseNucleiJsonl(text, jobId) {
  const findings = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const templateId = typeof obj["template-id"] === "string" ? obj["template-id"] : "";
    const info = typeof obj.info === "object" && obj.info !== null ? obj.info : {};
    const name = typeof info.name === "string" && info.name ? info.name : templateId || "Temuan Nuclei";
    const rawSeverity = typeof info.severity === "string" ? info.severity.toLowerCase() : "info";
    const severity = ["critical", "high", "medium", "low", "info"].includes(rawSeverity)
      ? rawSeverity
      : "info";
    const matched = typeof obj.matched === "string" && obj.matched ? obj.matched : obj.host || "";
    const description = typeof info.description === "string" ? info.description : "";
    let references = [];
    if (typeof info.reference === "string" && info.reference) references = [info.reference];
    else if (Array.isArray(info.reference)) references = info.reference.filter((r) => typeof r === "string");
    const tags = Array.isArray(info.tags) ? info.tags.filter((t) => typeof t === "string") : [];
    if (!templateId || !matched) continue;
    findings.push({
      id: `${jobId}-${findings.length}`,
      templateId,
      name,
      severity,
      matchedUrl: matched,
      description,
      references: references.slice(0, 10),
      tags: tags.slice(0, 20),
    });
  }
  return findings;
}

async function processJob(job) {
  console.log(`[worker] Mengambil job ${job.id} — ${job.url}`);
  const startedAt = Date.now();
  await reportResults(job.id, { status: "berjalan" });

  const hasNuclei = await checkNuclei();
  if (!hasNuclei) {
    console.log("[worker] Nuclei tidak ditemukan — melaporkan worker-belum-siap.");
    await reportResults(job.id, {
      status: "worker-belum-siap",
      error: "Binary Nuclei tidak ditemukan di mesin worker.",
      workerNote: INSTALL_NOTE,
      durationMs: Date.now() - startedAt,
    });
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "nuclei-scan-"));
  const outFile = join(dir, "hasil.jsonl");
  const args = ["-u", job.url, "-severity", job.severities.join(","), "-j", "-o", outFile, "-silent", "-nc"];
  if (Array.isArray(job.tags) && job.tags.length > 0) {
    args.push("-tags", job.tags.join(","));
  }
  console.log(`[worker] Menjalankan: ${NUCLEI_PATH} ${args.join(" ")}`);

  let findings = [];
  try {
    const res = await runCommand(NUCLEI_PATH, args, SCAN_TIMEOUT_MS);
    const durationMs = Date.now() - startedAt;
    if (res.timedOut) {
      await reportResults(job.id, {
        status: "gagal",
        error: `Scan melebihi batas waktu ${Math.round(SCAN_TIMEOUT_MS / 60000)} menit dan dihentikan.`,
        durationMs,
      });
      console.log(`[worker] Job ${job.id} timeout.`);
      return;
    }
    let text = "";
    try {
      text = await readFile(outFile, "utf-8");
    } catch {
      text = "";
    }
    findings = parseNucleiJsonl(text, job.id);
    if (res.code !== 0 && findings.length === 0) {
      const errText = (res.stderr || res.error || `Nuclei keluar dengan kode ${res.code}`).slice(0, 1000);
      await reportResults(job.id, {
        status: "gagal",
        error: `Nuclei gagal: ${errText}`,
        durationMs,
      });
      console.log(`[worker] Job ${job.id} gagal (exit ${res.code}).`);
      return;
    }
    await reportResults(job.id, { status: "selesai", findings, durationMs });
    console.log(`[worker] Job ${job.id} selesai: ${findings.length} temuan kandidat.`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  console.log(`[worker] Worker Scan URL jalan. APP_URL=${APP_URL}, NUCLEI_PATH=${NUCLEI_PATH}`);
  if (!WORKER_TOKEN) {
    console.log("[worker] PERINGATAN: WORKER_TOKEN kosong — hanya untuk mode lokal/dev.");
  }
  for (;;) {
    if (stopping) break;
    try {
      const job = await fetchQueuedJob();
      if (job) {
        await processJob(job);
        if (ONCE) break;
      } else {
        if (ONCE) {
          console.log("[worker] Tidak ada job antre — selesai (--once).");
          break;
        }
        await sleep(POLL_MS);
      }
    } catch (err) {
      console.error(`[worker] Error: ${err instanceof Error ? err.message : String(err)}`);
      if (ONCE) break;
      await sleep(POLL_MS);
    }
  }
  console.log("[worker] Worker berhenti.");
}

main().catch((err) => {
  console.error(`[worker] Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
