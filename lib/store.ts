import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiPromptKind,
  AiUsageEntry,
  AttackChain,
  ChainStep,
  Finding,
  FindingStatus,
  Payout,
  Program,
  Report,
  ReportStatus,
  Severity,
  Target,
  TargetKind,
} from "./types";
import { getChain } from "./chains";
import type { SyncState } from "./live";

const STORAGE_KEY = "bb-onchain-v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

export function randomAddress(): string {
  return "0x" + randomHex(40);
}

export function randomTxHash(): string {
  return "0x" + randomHex(64);
}

const NOW = "2026-11-16T16:30:00+07:00";

export const SEED_PROGRAMS: Program[] = [
  {
    id: "seed-program-1",
    name: "Contoh — Protokol Lending DeFi",
    description:
      "Program bounty contoh untuk protokol lending DeFi. Scope: smart contract lending, oracle harga, dan antarmuka web.",
    chainId: 11155111,
    token: "ETH",
    pool: 10,
    escrowLocked: 10,
    totalPaid: 0,
    tiers: { Critical: 5, High: 2, Medium: 0.5, Low: 0.1 },
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-program-2",
    name: "Contoh — Marketplace NFT",
    description:
      "Program bounty contoh untuk marketplace NFT. Scope: smart contract marketplace, sistem listing, dan antarmuka web.",
    chainId: 84532,
    token: "ETH",
    pool: 5,
    escrowLocked: 5,
    totalPaid: 0,
    tiers: { Critical: 2, High: 1, Medium: 0.3, Low: 0.05 },
    demo: true,
    createdAt: NOW,
  },
];

export const SEED_REPORTS: Report[] = [
  {
    id: "seed-report-1",
    title: "Contoh — IDOR pada endpoint profil pengguna",
    programId: "seed-program-1",
    vulnClass: "IDOR",
    skillName: "idor-vulnerability-hunting",
    severity: "High",
    description:
      "Contoh laporan: mengubah parameter ID pada endpoint profil memungkinkan akses data pengguna lain tanpa otorisasi.",
    poc: "1. Login sebagai pengguna A. 2. Panggil endpoint profil dengan ID pengguna B. 3. Respons mengembalikan data pengguna B.",
    target: "api.contoh-dapp.id/users/{id}",
    hunter: "0x7a3f9c1e5b2846d08a1f3c7e9b2d0456a8c1e3f5",
    status: "Baru",
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-report-2",
    title: "Contoh — XSS tersimpan di kolom komentar",
    programId: "seed-program-2",
    vulnClass: "XSS",
    skillName: "dom-based-cross-site-scripting-xss",
    severity: "Medium",
    description:
      "Contoh laporan: kolom komentar tidak membersihkan input sehingga skrip dapat tersimpan dan dieksekusi di browser pengunjung lain.",
    poc: "1. Kirim komentar dengan muatan uji di lingkungan lab. 2. Buka halaman sebagai pengguna lain. 3. Muatan tereksekusi saat halaman dimuat.",
    target: "marketplace.contoh-dapp.id/komentar",
    hunter: "0x9b21d4a7c803e5961f4a2b8d0c3e5f7a91b2c4d6",
    status: "Triase",
    demo: true,
    createdAt: NOW,
  },
];

// ---------------------------------------------------------------------------
// Seed Hunter Command Center
// ---------------------------------------------------------------------------

export const SEED_TARGETS: Target[] = [
  {
    id: "seed-target-1",
    kind: "web",
    name: "Contoh — Aplikasi Web Lab",
    url: "https://web.contoh-dapp.id",
    scopeNote: "Lab latihan resmi — hanya path /lab/* dan akun uji sendiri.",
    authorized: true,
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-target-2",
    kind: "contract",
    name: "Contoh — Kontrak Lending (Sepolia)",
    contractAddress: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
    chainId: 11155111,
    scopeNote: "Kontrak contoh di Sepolia — alamat demo, bukan kontrak sungguhan.",
    authorized: true,
    demo: true,
    createdAt: NOW,
  },
];

export const SEED_FINDINGS: Finding[] = [
  {
    id: "seed-finding-1",
    title: "Contoh — XSS tersimpan di kolom komentar",
    targetId: "seed-target-1",
    vulnClass: "XSS",
    skillName: "xss-reflected-stored-dom",
    severity: "Medium",
    description:
      "Contoh temuan: kolom komentar tidak membersihkan input sehingga skrip dapat tersimpan.",
    steps: "1. Kirim komentar teks uji di lab. 2. Buka halaman sebagai pengguna lain. 3. Amati apakah teks tampil tanpa encoding.",
    status: "Dikonfirmasi",
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-finding-2",
    title: "Contoh — Cookie session tanpa flag HttpOnly",
    targetId: "seed-target-1",
    vulnClass: "XSS",
    skillName: "dom-based-cross-site-scripting-xss",
    severity: "Low",
    description:
      "Contoh temuan: cookie session tidak memakai flag HttpOnly sehingga bisa dibaca skrip.",
    steps: "1. Buka DevTools → Application → Cookies. 2. Periksa flag cookie session.",
    status: "Baru",
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-finding-3",
    title: "Contoh — SSRF pada parameter URL gambar",
    targetId: "seed-target-1",
    vulnClass: "SSRF",
    skillName: "ssrf-server-side-request-forgery",
    severity: "High",
    description:
      "Contoh temuan: parameter URL gambar membuat server mengambil alamat yang diberikan.",
    steps: "1. Isi parameter URL dengan alamat uji milik sendiri. 2. Amati respons server.",
    status: "Baru",
    demo: true,
    createdAt: NOW,
  },
];

export const SEED_CHAINS: AttackChain[] = [
  {
    id: "seed-chain-1",
    name: "Contoh — XSS → Account Takeover",
    steps: [
      { label: "XSS tersimpan di kolom komentar", findingId: "seed-finding-1" },
      { label: "Curi cookie session lewat skrip", findingId: "seed-finding-2" },
      { label: "Pakai session korban untuk masuk sebagai korban" },
    ],
    impact: "Pengambilalihan akun pengguna (Account Takeover).",
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-chain-2",
    name: "Contoh — SSRF → Akses Metadata Cloud",
    steps: [
      { label: "SSRF pada parameter URL gambar", findingId: "seed-finding-3" },
      { label: "Arahkan ke endpoint metadata cloud internal" },
    ],
    impact: "Akses kredensial internal dan eskalasi ke eksekusi perintah.",
    demo: true,
    createdAt: NOW,
  },
];

export const SEED_RECON_DONE: Record<string, string[]> = {
  "seed-target-1": ["web-headers", "web-tech"],
};

interface StoredState {
  wallet: string | null;
  chainId: number;
  programs: Program[];
  reports: Report[];
  payouts: Payout[];
  targets?: Target[];
  findings?: Finding[];
  chains?: AttackChain[];
  reconDone?: Record<string, string[]>;
  aiUsage?: AiUsageEntry[];
  liveSync?: Record<string, SyncState>;
}

interface NewProgramInput {
  name: string;
  description: string;
  chainId: number;
  token: string;
  pool: number;
  tiers: Program["tiers"];
}

interface NewReportInput {
  title: string;
  programId: string;
  vulnClass: string;
  skillName?: string;
  severity: Severity;
  description: string;
  poc: string;
  target: string;
  hunter: string;
}

interface NewTargetInput {
  kind: TargetKind;
  name: string;
  url?: string;
  contractAddress?: string;
  chainId?: number;
  scopeNote: string;
  authorized: boolean;
}

interface NewFindingInput {
  title: string;
  targetId: string;
  vulnClass: string;
  skillName?: string;
  severity: Severity;
  description: string;
  steps: string;
}

export function useBugBountyStore() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(11155111);
  const [programs, setPrograms] = useState<Program[]>(SEED_PROGRAMS);
  const [reports, setReports] = useState<Report[]>(SEED_REPORTS);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [targets, setTargets] = useState<Target[]>(SEED_TARGETS);
  const [findings, setFindings] = useState<Finding[]>(SEED_FINDINGS);
  const [chains, setChains] = useState<AttackChain[]>(SEED_CHAINS);
  const [reconDone, setReconDone] = useState<Record<string, string[]>>(SEED_RECON_DONE);
  const [aiUsage, setAiUsage] = useState<AiUsageEntry[]>([]);
  const [liveSync, setLiveSync] = useState<Record<string, SyncState>>({});
  const [hydrated, setHydrated] = useState(false);

  // Muat state dari localStorage setelah mount (hindari mismatch SSR).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as StoredState;
        if (Array.isArray(data.programs)) setPrograms(data.programs);
        if (Array.isArray(data.reports)) setReports(data.reports);
        if (Array.isArray(data.payouts)) setPayouts(data.payouts);
        if (Array.isArray(data.targets)) setTargets(data.targets);
        if (Array.isArray(data.findings)) setFindings(data.findings);
        if (Array.isArray(data.chains)) setChains(data.chains);
        if (data.reconDone && typeof data.reconDone === "object") setReconDone(data.reconDone);
        if (Array.isArray(data.aiUsage)) setAiUsage(data.aiUsage);
        if (data.liveSync && typeof data.liveSync === "object") setLiveSync(data.liveSync);
        if (typeof data.chainId === "number") setChainId(data.chainId);
        if (typeof data.wallet === "string") setWallet(data.wallet);
      }
    } catch {
      // localStorage rusak / tidak tersedia: tetap pakai seed.
    }
    setHydrated(true);
  }, []);

  // Simpan state ke localStorage setiap kali berubah.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: StoredState = {
        wallet,
        chainId,
        programs,
        reports,
        payouts,
        targets,
        findings,
        chains,
        reconDone,
        aiUsage,
        liveSync,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Penyimpanan penuh / tidak tersedia: abaikan.
    }
  }, [wallet, chainId, programs, reports, payouts, targets, findings, chains, reconDone, aiUsage, liveSync, hydrated]);

  const connectWallet = useCallback(() => {
    setWallet(randomAddress());
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
  }, []);

  const switchChain = useCallback((id: number) => {
    setChainId(id);
  }, []);

  const createProgram = useCallback((input: NewProgramInput) => {
    const program: Program = {
      id: uid(),
      name: input.name,
      description: input.description,
      chainId: input.chainId,
      token: input.token.trim().toUpperCase() || getChain(input.chainId).symbol,
      pool: input.pool,
      escrowLocked: input.pool,
      totalPaid: 0,
      tiers: input.tiers,
      createdAt: new Date().toISOString(),
    };
    setPrograms((prev) => [program, ...prev]);
    return program;
  }, []);

  const createReport = useCallback((input: NewReportInput) => {
    const report: Report = {
      id: uid(),
      title: input.title,
      programId: input.programId,
      vulnClass: input.vulnClass,
      skillName: input.skillName || undefined,
      severity: input.severity,
      description: input.description,
      poc: input.poc,
      target: input.target,
      hunter: input.hunter,
      status: "Baru",
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [report, ...prev]);
    return report;
  }, []);

  const setReportStatus = useCallback((reportId: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
  }, []);

  // Bayar laporan yang sudah Diterima: lepas jumlah tier dari escrow ke hunter.
  const payReport = useCallback(
    (reportId: string): { ok: boolean; message: string } => {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return { ok: false, message: "Laporan tidak ditemukan." };
      if (report.status !== "Diterima") {
        return { ok: false, message: "Hanya laporan berstatus Diterima yang bisa dibayar." };
      }
      const program = programs.find((p) => p.id === report.programId);
      if (!program) return { ok: false, message: "Program tidak ditemukan." };
      const amount = program.tiers[report.severity];
      if (program.escrowLocked < amount) {
        return {
          ok: false,
          message: `Escrow tidak mencukupi (tersedia ${program.escrowLocked} ${program.token}, butuh ${amount} ${program.token}).`,
        };
      }
      const payout: Payout = {
        id: uid(),
        reportId: report.id,
        reportTitle: report.title,
        programName: program.name,
        hunter: report.hunter,
        chainId: program.chainId,
        amount,
        token: program.token,
        txHash: randomTxHash(),
        createdAt: new Date().toISOString(),
      };
      setPayouts((prev) => [payout, ...prev]);
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id
            ? { ...p, escrowLocked: p.escrowLocked - amount, totalPaid: p.totalPaid + amount }
            : p
        )
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: "Dibayar", paidAmount: amount } : r
        )
      );
      return { ok: true, message: `Dibayar ${amount} ${program.token} (simulasi).` };
    },
    [reports, programs]
  );

  // -------------------------------------------------------------------------
  // Hunter Command Center: target, recon, temuan, rantai, log AI.
  // -------------------------------------------------------------------------

  const addTarget = useCallback((input: NewTargetInput) => {
    const target: Target = {
      id: uid(),
      kind: input.kind,
      name: input.name,
      url: input.kind === "web" ? input.url : undefined,
      contractAddress: input.kind === "contract" ? input.contractAddress : undefined,
      chainId: input.kind === "contract" ? input.chainId : undefined,
      scopeNote: input.scopeNote,
      authorized: input.authorized,
      createdAt: new Date().toISOString(),
    };
    setTargets((prev) => [target, ...prev]);
    return target;
  }, []);

  const setTargetAuthorized = useCallback((targetId: string, authorized: boolean) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, authorized } : t))
    );
  }, []);

  const removeTarget = useCallback((targetId: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
    setReconDone((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  }, []);

  const toggleReconStep = useCallback((targetId: string, stepId: string) => {
    setReconDone((prev) => {
      const done = prev[targetId] ?? [];
      const next = done.includes(stepId)
        ? done.filter((s) => s !== stepId)
        : [...done, stepId];
      return { ...prev, [targetId]: next };
    });
  }, []);

  const addFinding = useCallback((input: NewFindingInput) => {
    const finding: Finding = {
      id: uid(),
      title: input.title,
      targetId: input.targetId,
      vulnClass: input.vulnClass,
      skillName: input.skillName || undefined,
      severity: input.severity,
      description: input.description,
      steps: input.steps,
      status: "Baru",
      createdAt: new Date().toISOString(),
    };
    setFindings((prev) => [finding, ...prev]);
    return finding;
  }, []);

  const setFindingStatus = useCallback((findingId: string, status: FindingStatus) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, status } : f))
    );
  }, []);

  // Status sinkronisasi satu temuan terhadap Live Feed (tersimpan lokal).
  const setFindingSync = useCallback((findingId: string, state: SyncState) => {
    setLiveSync((prev) => ({ ...prev, [findingId]: state }));
  }, []);

  // Impor temuan dari Live Feed ke daftar Temuan lokal (dedupe by id).
  // Temuan hasil impor sudah ada di feed, jadi langsung ditandai tersinkron.
  const importFinding = useCallback(
    (finding: Finding) => {
      if (findings.some((f) => f.id === finding.id)) return false;
      setFindings((prev) =>
        prev.some((f) => f.id === finding.id) ? prev : [finding, ...prev]
      );
      setLiveSync((prev) => ({ ...prev, [finding.id]: "synced" }));
      return true;
    },
    [findings]
  );

  // Kirim temuan yang sudah Dikonfirmasi menjadi laporan Platform.
  const sendFindingToPlatform = useCallback(
    (findingId: string): { ok: boolean; message: string } => {
      const finding = findings.find((f) => f.id === findingId);
      if (!finding) return { ok: false, message: "Temuan tidak ditemukan." };
      if (finding.status !== "Dikonfirmasi") {
        return { ok: false, message: "Hanya temuan berstatus Dikonfirmasi yang bisa dikirim ke Platform." };
      }
      if (!wallet) {
        return { ok: false, message: "Hubungkan wallet simulasi dulu untuk mengirim ke Platform." };
      }
      const program = programs[0];
      if (!program) {
        return { ok: false, message: "Buat program dulu di tab Platform." };
      }
      const target = targets.find((t) => t.id === finding.targetId);
      const targetText = target
        ? target.kind === "web"
          ? target.url ?? target.name
          : target.contractAddress ?? target.name
        : "-";
      createReport({
        title: finding.title,
        programId: program.id,
        vulnClass: finding.vulnClass,
        skillName: finding.skillName,
        severity: finding.severity,
        description: finding.description,
        poc: finding.steps,
        target: targetText,
        hunter: wallet,
      });
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, status: "Dilaporkan" } : f))
      );
      return { ok: true, message: `Temuan dikirim ke program ${program.name} sebagai laporan (simulasi).` };
    },
    [findings, wallet, programs, targets, createReport]
  );

  const addChain = useCallback((name: string, steps: ChainStep[], impact: string) => {
    const chain: AttackChain = {
      id: uid(),
      name,
      steps,
      impact,
      createdAt: new Date().toISOString(),
    };
    setChains((prev) => [chain, ...prev]);
    return chain;
  }, []);

  const removeChain = useCallback((chainId: string) => {
    setChains((prev) => prev.filter((c) => c.id !== chainId));
  }, []);

  const logAiUsage = useCallback(
    (entry: {
      model: string;
      kind: AiPromptKind | string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      ok: boolean;
      note?: string;
    }) => {
      const item: AiUsageEntry = {
        id: uid(),
        at: new Date().toISOString(),
        ...entry,
      };
      setAiUsage((prev) => [item, ...prev].slice(0, 100));
      return item;
    },
    []
  );

  const clearAiUsage = useCallback(() => {
    setAiUsage([]);
  }, []);

  const resetDemo = useCallback(() => {
    setPrograms(SEED_PROGRAMS);
    setReports(SEED_REPORTS);
    setPayouts([]);
    setTargets(SEED_TARGETS);
    setFindings(SEED_FINDINGS);
    setChains(SEED_CHAINS);
    setReconDone(SEED_RECON_DONE);
    setAiUsage([]);
    setLiveSync({});
    setChainId(11155111);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // abaikan
    }
  }, []);

  const stats = useMemo(() => {
    const escrowByToken = new Map<string, number>();
    const paidByToken = new Map<string, number>();
    for (const p of programs) {
      escrowByToken.set(p.token, (escrowByToken.get(p.token) ?? 0) + p.escrowLocked);
      paidByToken.set(p.token, (paidByToken.get(p.token) ?? 0) + p.totalPaid);
    }
    const hunters = new Set(reports.map((r) => r.hunter.toLowerCase()));
    const byStatus = new Map<string, number>();
    for (const r of reports) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    }
    const findingsBySeverity = new Map<string, number>();
    const findingsByStatus = new Map<string, number>();
    for (const f of findings) {
      findingsBySeverity.set(f.severity, (findingsBySeverity.get(f.severity) ?? 0) + 1);
      findingsByStatus.set(f.status, (findingsByStatus.get(f.status) ?? 0) + 1);
    }
    const authorizedTargets = targets.filter((t) => t.authorized).length;
    const aiCalls = aiUsage.filter((u) => u.ok).length;
    const aiTokens = aiUsage.reduce((sum, u) => sum + (u.totalTokens ?? 0), 0);
    return {
      totalPrograms: programs.length,
      totalReports: reports.length,
      totalPayouts: payouts.length,
      escrowByToken: [...escrowByToken.entries()],
      paidByToken: [...paidByToken.entries()],
      totalHunters: hunters.size,
      byStatus,
      totalTargets: targets.length,
      authorizedTargets,
      totalFindings: findings.length,
      findingsBySeverity,
      findingsByStatus,
      totalChains: chains.length,
      aiCalls,
      aiTokens,
    };
  }, [programs, reports, payouts, targets, findings, chains, aiUsage]);

  return {
    wallet,
    chainId,
    chain: getChain(chainId),
    programs,
    reports,
    payouts,
    targets,
    findings,
    chains,
    reconDone,
    aiUsage,
    liveSync,
    stats,
    hydrated,
    connectWallet,
    disconnectWallet,
    switchChain,
    createProgram,
    createReport,
    setReportStatus,
    payReport,
    addTarget,
    setTargetAuthorized,
    removeTarget,
    toggleReconStep,
    addFinding,
    setFindingStatus,
    setFindingSync,
    importFinding,
    sendFindingToPlatform,
    addChain,
    removeChain,
    logAiUsage,
    clearAiUsage,
    resetDemo,
  };
}

export type BugBountyStore = ReturnType<typeof useBugBountyStore>;
export type HunterStore = BugBountyStore;
export const useHunterStore = useBugBountyStore;
